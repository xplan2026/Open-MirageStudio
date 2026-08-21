# Suno 歌曲创作提示词技巧

> 来源：
> - [SUNO 进阶：抄这套配方公式和分风格模板，出歌更稳](https://mp.weixin.qq.com/s/-JE6u8JIEjo9qSwc99fpzQ)
> - [扒了 10 份指南，SUNO 提示词心法，让你从"抽卡"到"点菜"](https://mp.weixin.qq.com/s/LB4ga5ujqmZ82Z764WAVfQ)
>
> 作者：小谱（公众号"谱乐AI"）

---

## 一、核心分工：Style 框 vs Lyrics 框

这是新手最常犯的错误——把所有东西都塞进一个框里。

| 框 | 职责 | 示例 |
|----|------|------|
| **Style（风格）框** | 设定"声音的世界"：流派、速度、乐器、人声类型、氛围 | `Indie folk, 90 BPM, fingerpicking acoustic guitar, raspy male tenor` |
| **Lyrics（歌词）框** | 设定"这个世界里发生什么"：段落结构、唱法 | `[Verse 1]`、`[Chorus]`、`(whispered)` |

> **核心心法**：**Style 定世界，Lyrics 控世界里的细节。**

---

## 二、Style 框黄金公式

### 标签书写顺序（权重递减）

```
流派/子流派 → 速度/BPM → 核心乐器 → 人声类型 → 制作/氛围 → 修饰词
```

- **流派必须放第一**：分词器对前面的词前置加权，前三个词权重比后面十个加起来还重。
- **格式**：用逗号分隔的"标签流"，不要写成一段"作文"。
- **大写强调**：核心流派大写（如 `SYNTHWAVE`）可进一步提高权重。

### 标签数量"甜区"

- **最佳：5~8 个标签**
- 少于 4 个 → Suno 用默认值填充，结果泛化
- 多于 10 个 → 信号互相干扰
- **推荐配比**：1 流派 + 1 情绪 + 1~2 乐器 + 1 人声 + 1 制作标签

### 标准模板

```
Indie folk, 90 BPM warm, fingerpicking acoustic guitar, raspy male tenor, intimate dry vocals, analog warmth
```

---

## 三、三类决定性标签（新手与老手的分水岭）

### 1. 乐器标签

越具体越好：
- ❌ `guitar`
- ✅ `clean jangly Telecaster`
- ❌ `electronic sounds`
- ✅ `rolling bass, airy synths, house drums`

### 2. 制作标签（性价比最高的改动）

| 质感方向 | 标签示例 |
|----------|----------|
| Lo-fi 质感 | `lo-fi bedroom recording` |
| 商业制作 | `polished radio mix` |
| 现场感 | `raw live performance feel` |
| 模拟温暖感 | `warm analog` |

### 3. 人声标签（整首歌负载最重的地方）

格式：**性格 + 方式 + 效果**

- 示例：`raspy, breathy, close-mic recording, warm microphone`
- 意图式：`intimate lead vocal`、`bright pop vocal`

---

## 四、可直接照抄的分风格模板

### 英文流派模板（V5.5 实测）

| 风格 | 模板 |
|------|------|
| 暗黑 R&B | `dark r&b, moody, rhodes keys, trap hats, airy falsetto vocals, atmospheric reverb, late-night, 88 bpm` |
| Lo-fi 嘻哈 | `lo-fi hip hop, mellow, dusty piano samples, tape-saturated drums, soft chopped vocals, vinyl crackle, rainy afternoon, 82 bpm` |
| 雷鬼顿 | `reggaeton, playful, dembow rhythm, synth bass, latin percussion, spanish male vocals, summer party, 95 bpm` |
| 爵士说唱 | `jazz rap, boom bap, upright bass walking line, brushed drums, saxophone solo, melodic rap delivery, warm analog, 90 bpm` |

### 国风系列模板（中文提示词实测可用）

| 风格 | 模板 |
|------|------|
| 国风电音 | `中国风电子，古筝加合成器，空灵女声，水墨意境，downtempo` |
| 国风说唱 | `中国风 trap，快节奏说唱，琵琶采样，江湖氛围，霸气男声` |
| 赛博国风 | `复古合成器融合国风，古筝加电子鼓点，氛围神秘，女声演唱` |
| 国风抒情 | `Chinese style, pop, guzheng, erhu, gentle, male vocals`（歌词写山水） |

### 创造独特声音

组合 2~3 个流派，主导流派放最前面（权重最大）。

---

## 五、编曲控制：Lyrics 框结构标签

### 基础结构标签

用**方括号**包裹，每个标签不超过 3 个词：

```
[Intro] → [Verse 1] → [Chorus] → [Verse 2] → [Chorus] → [Bridge] → [Outro]
```

### 增强控制力

标签里可塞细节：
- `[verse, male vocals, melancholic]`
- `[chorus, female vocals, passionate]`

### 控制人声的两招

**段前描述标签**：
- `[Belted Chorus]` — 激昂副歌
- `[Whispered Verse]` — 气声主歌

**歌词内嵌指令**（用括号局部控制）：
- 主歌下写 `(whispered)`
- 副歌下写 `(belted, powerful)`
- 和声/adlib：`Rise up (rise up)`、`(oh yeah)`

### 让副歌层层递进

- 第一遍：完整歌词
- 第二遍：歌词减半，加和声
- 第三遍：只剩关键词 + 哼唱

### 常见坑

- `[Intro]` 标签有时不灵 → 更稳妥：在 Style 框写 `short instrumental intro`
- 音效别塞进歌词框 → 放 Style 框或留到后期制作

---

## 六、歌词排版技巧

### 避免赶拍吞字

- **句子长度**：每行 4~8 个词、6~10 个音节。把每行当作"一口气"来写。
- **音节对齐**：对应句子音节数尽量对齐，节奏才自然。
- **总字数**：2~3 分钟的歌，150~250 个词就够。宁可少词用战略性重复，也别塞满。

### 局部修复（不要整首重生成）

1. 缩短句子
2. 在段落间加入 `[Instrumental Break]`
3. 把一个长主歌拆成 `[Verse 1]` 和 `[Verse 2]`

### 排除不想要的乐器

- ❌ 在 Style 里写 `no drums`（基本不靠谱）
- ✅ 使用高级选项（Advanced Options）里的 `Exclude` 字段

---

## 七、V5.5 版本关键变化

| 变化 | 说明 |
|------|------|
| **BPM 真的生效了** | 但避免自相矛盾，如 `slow jazz` + `140 BPM` |
| **年代标签影响更显著** | `trap` + `1980s` 会带出门控混响鼓和合成器质感 |
| **instrumental 必须放最后** | 放别的位置出人声概率变高 |
| **模糊情绪词失效** | `energetic` 太飘，换 `urgent`/`driving`/`high-octane` |
| **流派贴合度变好** | `jazz` 更像真正爵士，而非"带爵士和弦的流行" |

### 年代精修声音

- `80s synth-pop` vs `2020s synth-pop` — 效果天差地别
- 想要"现代制作 + 复古乐器"：分开写 `modern production, vintage 1970s guitar tone`

---

## 八、社区技巧

### 对唱

- Style 里必须写 `Duet`，光靠歌词暗示无效
- 配合每句开头的 `[male vocals]` / `[female vocals]` 标签
- 全曲切换控制在 4~6 次

### 特殊人声

嘶吼（`scream`）标在 Style 框，别写进歌词。

### 模仿歌手风格

不能点名时用特征描述替代：

- "周杰伦式国风" → `Chinese style pop, piano intro, guzheng interlude, male vocal with lazy enunciation`

### 多用氛围、少堆乐理

Suno 更吃：
- ✅ `upbeat, nostalgic 80s vibe, driving rhythm`
- ❌ `120 BPM, C major, 4/4`

---

## 九、工作流纪律（高手与普通用户的分水岭）

### 三大纪律

1. **一次只改一个变量** — 同时改流派+速度+人声+结构，分不清哪个改动起了作用
2. **先短测，再出全曲** — 先生成 15~30 秒片段，验证钩子/律动/音色对不对，确认后再铺满
3. **局部问题，局部修复** — 用 `Remix`、`Replace Section`、`Extend`，不要整首推倒重来

### 核心纪律

- 留用的作品一律用 **Custom Mode**（分开控制 Style 和 Lyrics）
- 结构标签（如 `[Intro]`）放歌词框，不放 Style 框
- 别用同义词灌水（六个 `sad` 不会更悲伤）
- 别写自相矛盾的标签
- 别让歌词情绪和 Style 情绪打架

---

## 十、高频坑总结

| 坑 | 正确做法 |
|----|----------|
| 用模糊形容词（`Beautiful`、`Nice`） | 用具体描述替代 |
| 用人名代替风格 | 用特征描述替代 |
| 把所有东西塞一个框 | Style 定世界，Lyrics 控细节 |
| 歌词塞太满 | 2~3 分钟歌 150~250 词 |
| 整首推倒重来 | 用 Remix/Replace Section/Extend 局部修 |
| Style 写 `no drums` | 用 Exclude 字段 |
| 英文提示更准 | 中文也可用，但建议对比测试 |

---

## 十一、心法总结

1. **成功率预期**：约 70% 的初版因"流派没贴住"需重生成 3 次以上。不要指望一发入魂。
2. **提示词定位**：提示词是给模型的"信号"，不是"命令"。它帮你把方向讲清楚，真正拉开差距的是你的迭代和审美。
3. **写法决定结果**：写得像朋友圈吐槽 → 出来是网红 BGM；写得像制作人备忘录 → 出来才像作品。

---

## 对 Lemong Agent 的参考价值

Lemong Agent 使用的是 ACE API（非 Suno），但以下经验可迁移：

1. **Style/Lyrics 分离理念**：ACE 的 `caption`（风格描述）与歌词也应严格分离，这与我们已验证的"歌词中不得混入英文描述"规则一致
2. **标签顺序权重**：ACE 可能也有类似的前置加权机制，`caption` 中应把最关键的风格词放在最前面
3. **具体优于模糊**：`energetic` → `driving, high-octane` 的精确化思路适用于所有 AI 音乐模型
4. **一次只改一个变量**：与我们测试 DS-渔利各版本时的教训一致
5. **局部修复优于整首重来**：ACE 的 continue 模式可类比 Suno 的 Extend/Replace Section
