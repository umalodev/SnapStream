// recording/ffmpegRecorder.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { LiveStream } = require('../models');

const recordings = {}; // roomId -> { proc, tempPath, finalPath, startedAt }

function ensureUploads() {
  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function startFfmpegRecording(
  roomId,
  { httpUrl, videoPort, audioPort, vcodec = 'libx264', acodec = 'aac', bitrate = '2000k' } = {}
) {
  if (recordings[roomId]) throw new Error('Recording already running');

  const uploads = ensureUploads();
  const timestamp = Date.now();
  const finalFilename = `${roomId}_${timestamp}.mp4`;
  const tempFilename = `${finalFilename}.part`;

  const finalPath = path.join(uploads, finalFilename);
  const tempPath = path.join(uploads, tempFilename);

  const args = [];

  // INPUT (HTTP preferred)
  if (httpUrl) {
    args.push('-fflags', 'nobuffer', '-i', httpUrl);
  } else if (videoPort && audioPort) {
    args.push('-i', `udp://127.0.0.1:${videoPort}?fifo_size=2000000&overrun_nonfatal=1`);
    args.push('-i', `udp://127.0.0.1:${audioPort}?fifo_size=2000000&overrun_nonfatal=1`);
  } else {
    throw new Error('No ffmpeg input specified');
  }

  // ENCODING
  args.push(
    '-fflags', '+genpts+igndts',
    '-use_wallclock_as_timestamps', '1',
    '-c:v', vcodec,
    '-b:v', bitrate,
    '-c:a', acodec,
    '-b:a', '128k'
  );

  /**
   * 📌 BAGIAN TERPENTING:
   * +faststart = memindahkan metadata (moov) ke awal file
   * tanpa ini, video > 2 menit tidak bisa diputar!
   */
  args.push(
    '-f', 'mp4',
    '-movflags', '+faststart+frag_keyframe+empty_moov+default_base_moof',
    '-y',
    tempPath
  );

  const proc = spawn('ffmpeg', args);

  proc.stderr.on('data', (d) => {
    console.log(`[ffmpeg ${roomId}] ${d.toString()}`);
  });

  proc.on('error', (err) => {
    console.error(`[ffmpeg ${roomId}] error:`, err);
  });

  proc.on('close', async (code) => {
    try {
      console.log(`[ffmpeg ${roomId}] exited with code ${code}`);

      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, finalPath);
        console.log(`[ffmpeg ${roomId}] Finalized recording → ${finalPath}`);

        await LiveStream.update(
          {
            isRecording: false,
            status: 'recorded',
            recordingPath: `/uploads/${finalFilename}`,
          },
          { where: { id: roomId } }
        );
      }
    } catch (e) {
      console.error(`[ffmpeg ${roomId}] finalize error`, e);
    } finally {
      delete recordings[roomId];
    }
  });

  recordings[roomId] = { proc, tempPath, finalPath, startedAt: new Date() };

  // Tentative DB update
  LiveStream.update(
    {
      isRecording: true,
      status: 'recording',
      recordingPath: `/uploads/${finalFilename}`,
    },
    { where: { id: roomId } }
  ).catch(console.error);

  return recordings[roomId];
}

function stopFfmpegRecording(roomId, timeoutMs = 15000) {
  const entry = recordings[roomId];
  if (!entry) return Promise.resolve({ ok: false, reason: 'not_running' });

  const { proc, tempPath, finalPath } = entry;

  return new Promise((resolve) => {
    let finished = false;

    const finalize = () => {
      if (finished) return;
      finished = true;

      try {
        if (fs.existsSync(tempPath)) fs.renameSync(tempPath, finalPath);
      } catch (e) {
        console.error('[ffmpeg finalize rename error]', e);
      }

      LiveStream.update(
        {
          isRecording: false,
          status: 'recorded',
          recordingPath: `/uploads/${path.basename(finalPath)}`,
        },
        { where: { id: roomId } }
      )
        .then(() => resolve({ ok: true, finalPath }))
        .catch(() => resolve({ ok: true, finalPath }));

      delete recordings[roomId];
    };

    proc.once('close', finalize);

    try {
      if (!proc.killed) {
        if (proc.stdin && !proc.stdin.destroyed) {
          try {
            proc.stdin.write('q');
          } catch (e) {
            proc.kill('SIGINT');
          }
        } else {
          proc.kill('SIGINT');
        }
      }
    } catch (e) {
      console.error('stop error', e);
    }

    // Force kill after timeout
    setTimeout(() => {
      if (!finished) {
        try {
          proc.kill('SIGKILL');
        } catch (e) {}
        setTimeout(finalize, 500);
      }
    }, timeoutMs);
  });
}

module.exports = { startFfmpegRecording, stopFfmpegRecording, recordings };
