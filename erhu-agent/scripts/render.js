#!/usr/bin/env node
/**
 * Erhu Agent — 视频合成（FFmpeg）
 *
 * 静图 → Ken Burns 视频片段 → 拼接 → 叠加音频 + 硬字幕
 *
 * 用法:
 *   node erhu-agent/scripts/render.js <作品名> [--lyric-start <秒数>] [--s2v-dir <目录>] [--s2v-start <秒数>] [--dry-run]
 *
 *   示例:
 *     node erhu-agent/scripts/render.js 此身长在画图间 --lyric-start 8.5
 *     node erhu-agent/scripts/render.js 此身长在画图间 --s2v-dir data/Erhu-data/此身长在画图间/s2v --s2v-start 8.5
 *     node erhu-agent/scripts/render.js 此身长在画图间 --dry-run
 *
 * 输入:  data/Erhu-data/{作品名}/images/ + {作品名}.mp3 + 歌词.txt (+ 可选 s2v/ 对口型片段)
 * 输出:  data/Erhu-data/{作品名}/{作品名}.mp4
 *
 * 混合渲染: 若存在 --s2v-dir（默认 {作品名}/s2v/）中的对口型 mp4 片段，
 *   则按 --s2v-start 起顺序铺对口型段，其余时间用图片 Ken Burns 空镜补齐。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const ERHU_DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Erhu-data');

/**
 * 获取音频时长（秒）
 */
function getAudioDuration(audioPath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { stdio: 'pipe' }
    ).toString().trim();
    return parseFloat(result);
  } catch (err) {
    throw new Error(`无法读取音频时长: ${err.message}`);
  }
}

/**
 * 解析歌词为带时间戳的句子列表
 * @param {string} lyricsText - 歌词文本
 * @param {number} totalDuration - 音频总时长（秒）
 * @param {number} lyricStart - 歌词开始的时间偏移（秒），默认 0
 */
function parseLyricsWithTiming(lyricsText, totalDuration, lyricStart = 0) {
  const lines = lyricsText.split('\n').filter(l => l.trim());
  const lyricLines = [];
  let currentSection = '';

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[(.+)\]\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
    } else if (line.trim() && !line.startsWith('#')) {
      lyricLines.push({ section: currentSection, text: line.trim() });
    }
  }

  if (lyricLines.length === 0) {
    return [];
  }

  // 歌词有效时间段：从 lyricStart 到 totalDuration
  const lyricDuration = totalDuration - lyricStart;
  const totalLines = lyricLines.length;
  const baseTimePerLine = lyricDuration / totalLines;

  return lyricLines.map((line, i) => ({
    ...line,
    startTime: lyricStart + i * baseTimePerLine,
    endTime: lyricStart + (i + 1) * baseTimePerLine,
    displayTime: baseTimePerLine
  }));
}

/**
 * 获取图片文件列表（按文件名排序）
 */
function getImageList(imagesDir) {
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`图片目录不存在: ${imagesDir}`);
  }

  return fs.readdirSync(imagesDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();
}

/**
 * 生成单个 Ken Burns 视频片段
 * 对静图施加缩放+平移效果，输出固定时长的视频片段
 */
function createKenBurnsSegment(imagePath, outputPath, duration, index) {
  const zoomDir = index % 2 === 0 ? 'zoom_in' : 'zoom_out';
  const panDir = ['left', 'center', 'right'][index % 3];

  let zoompanFilter;
  if (zoomDir === 'zoom_in') {
    // 从 1.0 放大到 1.3
    zoompanFilter = `zoompan=z='min(zoom+0.0015,1.3)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25`;
  } else {
    // 从 1.3 缩小到 1.0
    zoompanFilter = `zoompan=z='max(zoom-0.0015,1.0)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25`;
  }

  execSync(
    `ffmpeg -y -loop 1 -i "${imagePath}" ` +
    `-vf "${zoompanFilter}" ` +
    `-t ${duration} -r 25 -pix_fmt yuv420p -c:v libx264 -preset fast ` +
    `"${outputPath}" 2>/dev/null`,
    { stdio: 'pipe', timeout: 60000 }
  );
}

/**
 * 读取视频时长（秒）
 */
function getVideoDuration(videoPath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
    { stdio: 'pipe' }
  ).toString().trim();
  return parseFloat(out);
}

/**
 * 读取对口型视频片段（按文件名排序），返回 { file, duration }
 */
function readS2vSegments(s2vDir) {
  if (!fs.existsSync(s2vDir)) return [];
  return fs.readdirSync(s2vDir)
    .filter((f) => /\.mp4$/i.test(f))
    .sort()
    .map((f) => {
      const file = path.join(s2vDir, f);
      return { file, duration: getVideoDuration(file) };
    });
}

/**
 * 构建混合渲染时间线：对口型段按实际时长顺序铺在 [s2vStart, ...)，
 * 其余区间用空镜补齐。
 */
function buildMixedTimeline(totalDuration, s2vSegments, s2vStart) {
  const timeline = [];
  let cursor = 0;
  let t = s2vStart;
  for (const s of s2vSegments) {
    if (t >= totalDuration) break;
    if (t > cursor) timeline.push({ type: 'kenburns', start: cursor, end: t });
    const end = Math.min(t + s.duration, totalDuration);
    timeline.push({ type: 's2v', start: t, end, file: s.file });
    cursor = end;
    t += s.duration;
  }
  if (cursor < totalDuration) {
    timeline.push({ type: 'kenburns', start: cursor, end: totalDuration });
  }
  return timeline;
}

/**
 * 归一化对口型片段：统一 1920x1080@25 + yuv420p，并裁剪到指定时长
 */
function normalizeS2vClip(input, output, duration) {
  execSync(
    `ffmpeg -y -i "${input}" ` +
    `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=25" ` +
    `-t ${duration} -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -preset fast ` +
    `"${output}" 2>/dev/null`,
    { stdio: 'pipe', timeout: 300000 }
  );
}

/**
 * 为某段空镜区间生成 Ken Burns 片段（图片均分时长）
 * @returns {string[]} 片段文件路径
 */
function renderKenBurnsRegion(imagesDir, images, regionDuration, regionIndex, tempDir) {
  const perImage = regionDuration / images.length;
  const paths = [];
  for (let i = 0; i < images.length; i++) {
    const out = path.join(tempDir, `kb_${String(regionIndex).padStart(2, '0')}_${String(i).padStart(3, '0')}.mp4`);
    createKenBurnsSegment(path.join(imagesDir, images[i]), out, perImage, regionIndex * images.length + i);
    paths.push(out);
  }
  return paths;
}

/**
 * 重编码拼接（混合来源片段统一后拼接）
 */
function concatSegments(segmentPaths, outputPath) {
  const listPath = `${outputPath}.concat.txt`;
  fs.writeFileSync(listPath, segmentPaths.map((p) => `file '${p}'`).join('\n'), 'utf-8');
  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe', timeout: 600000 }
    );
  } finally {
    fs.rmSync(listPath, { force: true });
  }
}

/**
 * 创建淡入淡出转场效果（跨片段的 concat filter）
 */
function concatWithTransitions(segmentPaths, concatFilePath, totalDuration) {
  // 写入文件列表
  const fileListContent = segmentPaths.map(p => `file '${p}'`).join('\n');
  fs.writeFileSync(concatFilePath, fileListContent, 'utf-8');

  const concatVideo = concatFilePath.replace('.txt', '_concat.mp4');

  // 简单拼接（无转场）
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" ` +
    `-c copy "${concatVideo}" 2>/dev/null`,
    { stdio: 'pipe', timeout: 120000 }
  );

  return concatVideo;
}

/**
 * 叠加音频 + 硬字幕到视频
 */
function addAudioAndSubtitles(videoPath, audioPath, lyrics, outputPath) {
  // 构建 drawtext 滤镜链（逐句显示歌词）
  const subtitleFilters = lyrics.map((line, i) => {
    const escapedText = line.text
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"');

    return `drawtext=text='${escapedText}':fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc:fontsize=32:fontcolor=white:bordercolor=black@0.5:borderw=2:x=(w-text_w)/2:y=h-th-80:enable='between(t,${line.startTime},${line.endTime})'`;
  });

  const filterComplex = subtitleFilters.join(',');

  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${audioPath}" ` +
    `-vf "${filterComplex}" ` +
    `-map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac -b:a 192k ` +
    `-shortest -pix_fmt yuv420p -preset fast ` +
    `"${outputPath}" 2>/dev/null`,
    { stdio: 'pipe', timeout: 300000 }
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // 解析 --lyric-start 参数
  let lyricStart = 0;
  const lyricStartIdx = args.indexOf('--lyric-start');
  if (lyricStartIdx !== -1 && lyricStartIdx + 1 < args.length) {
    lyricStart = parseFloat(args[lyricStartIdx + 1]);
    if (isNaN(lyricStart) || lyricStart < 0) {
      console.error('错误: --lyric-start 必须是非负数');
      process.exit(1);
    }
  }

  // 解析 --s2v-dir / --s2v-start 参数
  let s2vDir = null;
  const s2vDirIdx = args.indexOf('--s2v-dir');
  if (s2vDirIdx !== -1 && s2vDirIdx + 1 < args.length) {
    s2vDir = args[s2vDirIdx + 1];
  }
  let s2vStart = 0;
  const s2vStartIdx = args.indexOf('--s2v-start');
  if (s2vStartIdx !== -1 && s2vStartIdx + 1 < args.length) {
    s2vStart = parseFloat(args[s2vStartIdx + 1]);
    if (isNaN(s2vStart) || s2vStart < 0) {
      console.error('错误: --s2v-start 必须是非负数');
      process.exit(1);
    }
  }

  const songName = args.find(a => !a.startsWith('--') && isNaN(parseFloat(a)));

  if (!songName) {
    console.error('用法: node render.js <作品名> [--lyric-start <秒数>] [--s2v-dir <目录>] [--s2v-start <秒数>] [--dry-run]');
    console.error('示例: node render.js 此身长在画图间 --lyric-start 8.5');
    process.exit(1);
  }

  try {
    const songDir = path.join(ERHU_DATA_DIR, songName);
    const imagesDir = path.join(songDir, 'images');
    const audioPath = path.join(songDir, `${songName}.mp3`);
    const lyricsPath = path.join(songDir, '歌词.txt');
    const outputPath = path.join(songDir, `${songName}.mp4`);
    const tempDir = path.join(songDir, '.temp');

    // 检查输入
    if (!fs.existsSync(audioPath)) {
      throw new Error(`未找到音频: ${audioPath}`);
    }
    if (!fs.existsSync(lyricsPath)) {
      throw new Error(`未找到歌词: ${lyricsPath}`);
    }

    // 1. 获取音频时长
    const totalDuration = getAudioDuration(audioPath);
    console.log(`🎬 视频合成: "${songName}"`);
    console.log(`   音频时长: ${totalDuration.toFixed(1)}s`);

    // 2. 获取图片列表
    const images = getImageList(imagesDir);
    console.log(`   图片数量: ${images.length} 张`);

    if (images.length === 0) {
      throw new Error('没有可用的图片');
    }

    // 3. 解析歌词时序
    const lyrics = parseLyricsWithTiming(
      fs.readFileSync(lyricsPath, 'utf-8'),
      totalDuration,
      lyricStart
    );
    console.log(`   歌词行数: ${lyrics.length}`);
    console.log(`   歌词起始: ${lyricStart}s → 结束: ${totalDuration.toFixed(1)}s (每行 ${((totalDuration - lyricStart) / lyrics.length).toFixed(1)}s)`);

    // 检测对口型片段（默认 {作品名}/s2v/）
    const effectiveS2vDir = s2vDir ? path.resolve(WORKSPACE_ROOT, s2vDir) : path.join(songDir, 's2v');
    const s2vSegments = readS2vSegments(effectiveS2vDir);
    if (s2vSegments.length > 0) {
      console.log(`   🎤 对口型片段: ${s2vSegments.length} 个 (${effectiveS2vDir})`);
    }

    if (dryRun) {
      if (s2vSegments.length > 0) {
        console.log(`🔍 --dry-run 混合时间线 (对口型从 ${s2vStart}s 起):`);
        const timeline = buildMixedTimeline(totalDuration, s2vSegments, s2vStart);
        for (const seg of timeline) {
          const label = seg.type === 's2v' ? `对口型 ${path.basename(seg.file)}` : '空镜 Ken Burns';
          console.log(`   [${seg.start.toFixed(1)}s → ${seg.end.toFixed(1)}s] ${label}`);
        }
      } else {
        console.log(`🔍 --dry-run: 每张图片展示 ${(totalDuration / images.length).toFixed(1)}s`);
      }
      console.log(`   输出: ${outputPath}`);
      return;
    }

    // 4. 创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 5-6. 生成片段并拼接（混合渲染 or 纯空镜）
    let concatVideo;
    if (s2vSegments.length > 0) {
      const timeline = buildMixedTimeline(totalDuration, s2vSegments, s2vStart);
      const segmentPaths = [];
      let kbRegionIdx = 0;
      console.log(`\n🎬 混合渲染 (${timeline.length} 个区间)...`);
      for (const seg of timeline) {
        const segDur = seg.end - seg.start;
        if (seg.type === 's2v') {
          const out = path.join(tempDir, `s2v_${String(segmentPaths.length).padStart(3, '0')}.mp4`);
          normalizeS2vClip(seg.file, out, segDur);
          segmentPaths.push(out);
          console.log(`   🎤 对口型 [${seg.start.toFixed(1)}s→${seg.end.toFixed(1)}s] ${path.basename(seg.file)}`);
        } else {
          const kbPaths = renderKenBurnsRegion(imagesDir, images, segDur, kbRegionIdx++, tempDir);
          segmentPaths.push(...kbPaths);
          console.log(`   🖼️  空镜   [${seg.start.toFixed(1)}s→${seg.end.toFixed(1)}s] ${kbPaths.length} 张`);
        }
      }
      console.log('🔗 拼接视频 (混合)...');
      concatVideo = path.join(tempDir, 'mixed_concat.mp4');
      concatSegments(segmentPaths, concatVideo);
    } else {
      const durationPerImage = totalDuration / images.length;
      const segmentPaths = [];
      console.log(`\n🎞️  生成 Ken Burns 片段...`);
      for (let i = 0; i < images.length; i++) {
        const imgPath = path.join(imagesDir, images[i]);
        const segPath = path.join(tempDir, `seg_${String(i).padStart(3, '0')}.mp4`);
        process.stdout.write(`   [${i + 1}/${images.length}] ${images[i]} → seg_${String(i).padStart(3, '0')}.mp4\r`);
        createKenBurnsSegment(imgPath, segPath, durationPerImage, i);
        segmentPaths.push(segPath);
      }
      console.log(`\n   ✅ ${segmentPaths.length} 个片段`);
      console.log('🔗 拼接视频...');
      const concatFile = path.join(tempDir, 'concat.txt');
      concatVideo = concatWithTransitions(segmentPaths, concatFile, totalDuration);
    }

    // 7. 叠加音频 + 字幕
    console.log('🎵 叠加音频 + 字幕...');
    addAudioAndSubtitles(concatVideo, audioPath, lyrics, outputPath);

    // 8. 清理临时文件
    console.log('🧹 清理临时文件...');
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`\n✅ MV 生成完成: ${outputPath}`);

  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

main();
