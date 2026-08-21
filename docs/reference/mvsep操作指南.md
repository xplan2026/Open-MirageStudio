

创建分离任务
要创建分离任务，您需要对以下网址进行 POST 调用：
https://mvsep.com/api/separation/create


查询参数
字段	类型	说明
api_token	String	您的 API Key
audiofile	Binary	要处理的音频文件
sep_type	Integer	(可选) 分离类型，默认为11 (Demucs3 Model B (人声，鼓声，贝斯，其他))
add_opt1	String	(可选) 分离类型的第一个额外字段
add_opt2	String	(可选) 分离类型的第二个额外字段
output_format	Integer	(可选) 输出格式，默认为0 (mp3 (320kbps))
is_demo	Boolean	(可选) 是否将分离结果发布到示例页，默认为false
分离类型 (sep_type) 值
名称	值
Ensemble (vocals, instrum)	26
Ensemble (vocals, instrum, bass, drums, other)	28
Ensemble All-In (vocals, bass, drums, piano, guitar, lead/back vocals, other)	30
BS Roformer SW (vocals, bass, drums, guitar, piano, other)	63
Demucs4 HT (vocals, drums, bass, other)	20
BS Roformer (vocals, instrumental)	40
BS PolarFormer (vocals, instrumental)	123
MelBand Roformer (vocals, instrumental)	48
MDX23C (vocals, instrumental)	25
SCNet (vocals, instrumental)	46
MDX B (vocals, instrumental)	23
Ultimate Vocal Remover VR (vocals, music)	9
Demucs4 Vocals 2023 (vocals, instrum)	27
MVSep Karaoke (lead/back vocals)	49
MDX-B Karaoke (lead/back vocals)	12
MVSep Crowd removal (crowd, other)	34
Medley Vox (Multi-singer separation)	53
MVSep Multichannel BS (vocals, instrumental)	43
MVSep Male/Female separation	57
MVSep Choir (choir, other)	112
MVSep SATB Choir (soprano, alto, tenor, bass)	111
MVSep Drums (drums, other)	44
MVSep Bass (bass, other)	41
MVSep Synth (synth, other)	88
DrumSep (4-6 stems: kick, snare, cymbals, toms, ride, hh, crash)	37
MVSep Piano (piano, other)	29
MVSep Digital Piano (digital-piano, other)	79
MVSep Keys (keys, other)	106
MVSep Organ (organ, other)	58
MVSep Harpsichord (harpsichord, other)	91
MVSep Accordion (accordion, other)	99
MVSep Guitar (guitar, other)	31
MVSep Acoustic Guitar (acoustic-guitar, other)	66
MVSep Electric Guitar (electric-guitar, other)	81
MVSep Lead/Rhythm Guitar (lead-guitar, rhythm-guitar)	101
MVSep Pedal Steel Guitar	124
MVSep Plucked Strings (plucked-strings, other)	102
MVSep Harp (harp, other)	72
MVSep Mandolin (mandolin, other)	74
MVSep Banjo (banjo, other)	83
MVSep Sitar (sitar, other)	90
MVSep Ukulele (ukulele, other)	96
MVSep Dobro (dobro, other)	97
MVSep Bowed Strings (strings, other)	52
MVSep Violin (violin, other)	65
MVSep Viola (viola, other)	69
MVSep Cello (cello, other)	70
MVSep Double Bass (double-bass, other)	73
MVSep Wind (wind, other)	54
MVSep Brass (brass, other)	107
MVSep Woodwind (woodwind, other)	108
MVSep Saxophone (saxophone, other)	61
MVSep Flute (flute, other)	67
MVSep Trumpet (trumpet, other)	71
MVSep Trombone (trombone, other)	75
MVSep Oboe (oboe, other)	77
MVSep Clarinet (clarinet, other)	78
MVSep French Horn (french-horn, other)	82
MVSep Harmonica (harmonica, other)	87
MVSep Tuba (tuba, other)	92
MVSep Bassoon (bassoon, other)	93
MVSep Bagpipes (bagpipes , other)	116
MVSep Percussion (percussion, other)	105
MVSep Tambourine (tambourine, other)	76
MVSep Marimba (marimba, other)	84
MVSep Glockenspiel (glockenspiel, other)	85
MVSep Timpani (timpani, other)	86
MVSep Triangle (triangle, other)	89
MVSep Congas (congas , other)	94
MVSep Bells (bells, other)	95
MVSep Wind Chimes (wind-chimes, other)	98
MVSep Xylophone (xylophone, other)	109
MVSep Celesta (celesta, other)	110
MVSep Demucs4HT DNR (speech, music, effects)	24
BandIt Plus (speech, music, effects)	36
BandIt v2 (speech, music, effects)	45
MVSep DnR v3 (speech, music, effects)	56
MVSep Braam	117
MVSep Risers	125
MVSep FX	122
Apollo Enhancers (by JusperLee, Lew, baicai1145)	51
Reverb Removal (noreverb)	22
DeNoise by aufr33 and gabox	47
AudioSR (Super Resolution)	59
FlashSR (Super Resolution)	60
Stable Audio Open Gen	62
Whisper (extract text from audio)	39
Parakeet (extract text from audio)	64
VibeVoice (Voice Cloning)	103
VibeVoice (TTS)	104
Qwen3-TTS (Custom Voice)	118
Qwen3-TTS (Voice Design)	119
Qwen3-TTS (Voice Cloning)	120
Mega 53-stem Model	126
Bark (Speech Gen)	115
MVSep MultiSpeaker (MDX23C)	42
Aspiration (by Sucial)	50
Phantom Centre extraction	55
Matchering (by sergree)	68
SOME (Singing-Oriented MIDI Extractor)	80
Transkun (Piano -> MIDI)	113
Basic Pitch (MIDI Extraction)	114
ADTOF Plus (Drums -> MIDI)	127
HeartMuLa (Song Gen)	121
Demucs3 Model (vocals, drums, bass, other)	10
MDX A/B (vocals, drums, bass, other)	7
Vit Large 23 (vocals, instrum)	33
UVRv5 Demucs (vocals, music)	17
MVSep DNR (music, sfx, speech)	18
MVSep Old Vocal Model (vocals, music)	19
Demucs2 (vocals, drums, bass, other)	13
Danna Sep (vocals, drums, bass, other)	15
Byte Dance (vocals, drums, bass, other)	16
MVSep MelBand Roformer (vocals, instrum)	35
spleeter	0
UnMix	3
Zero Shot (Query Based) (Low quality)	14
LarsNet (kick, snare, cymbals, toms, hihat)	38
额外字段 (add_opt1, add_opt2) 值
键	算法	名称	选项
add_opt1	Ultimate Vocal Remover VR (vocals, music)	Model Type	
0 - HP2-4BAND-3090_4band_arch-500m_1
1 - HP2-4BAND-3090_4band_2
2 - HP2-4BAND-3090_4band_1
3 - HP_4BAND_3090
4 - Vocal_HP_4BAND_3090
5 - Vocal_HP_4BAND_3090_AGG
6 - HP2-MAIN-MSB2-3BAND-3090
7 - HP-4BAND-V2
8 - HP-KAROKEE-MSB2-3BAND-3090 (Karaokee model)
9 - WIP-Piano-4band-129605kb (Piano model)
10 - drums-4BAND-3090_4band (Drums model)
11 - bass-4BAND-3090_4band (Bass model)
12 - karokee_4band_v2_sn (Karaokee model v2)
13 - UVR-De-Echo-Aggressive
14 - UVR-De-Echo-Normal
15 - UVR-DeNoise
16 - UVR-DeEcho-DeReverb
17 - UVR-BVE-4B_SN-44100-1 (Back vocals model)
add_opt2	Ultimate Vocal Remover VR (vocals, music)	Agressiveness	
0.3 - 0.3
0.1 - 0.1
0.2 - 0.2
0.4 - 0.4
0.5 - 0.5
0.6 - 0.6
0.7 - 0.7
0.8 - 0.8
0.9 - 0.9
1.0 - 1.0
add_opt1	UVRv5 Demucs (vocals, music)	Model Type	
0 - UVR_Demucs_Model_1
1 - UVR_Demucs_Model_2
2 - UVR_Demucs_Model_Bag
add_opt1	MDX A/B (vocals, drums, bass, other)	Vocal model type	
0 - MDX A (Contest Version)
3 - MDX Kimberley Jensen 2023.02.12 SDR: 9.30 (New)
1 - MDX UVR 2022.01.01 SDR 8.62
2 - MDX UVR 2022.07.25 SDR 8.51
add_opt1	Zero Shot (Query Based) (Low quality)	Model Type	
0 - Bass (MUSDB18HQ AVG)
1 - Drums (MUSDB18HQ AVG)
2 - Vocals (MUSDB18HQ AVG)
3 - Other (MUSDB18HQ AVG)
add_opt1	Demucs4 HT (vocals, drums, bass, other)	Model type	
0 - htdemucs_ft (High Quality, Slow)
1 - htdemucs (Good Quality, Fast)
2 - htdemucs_6s (6 stems, additional piano and guitar)
add_opt1	MDX B (vocals, instrumental)	Vocal model type	
7 - MDX Kimberley Jensen v2 2023.05.21 (SDR: 9.60)
0 - MDX UVR 2022.01.01 (SDR: 8.83)
1 - MDX UVR 2022.07.25(SDR: 8.67)
2 - MDX Kimberley Jensen v1 2023.02.12 (SDR: 9.48)
4 - UVR-MDX-NET-Inst_HQ_2 (SDR: 9.12)
5 - UVR_MDXNET_Main (SDR: 8.79)
6 - MDX Kimberley Jensen Inst (SDR: 9.28)
8 - UVR-MDX-NET-Inst_HQ_3 (SDR: 9.38)
9 - UVR-MDX-NET-Voc_FT (SDR: 9.64)
11 - UVR-MDX-NET-Inst_HQ_4 (SDR: 9.71)
12 - UVR-MDX-NET-Inst_HQ_5 (SDR: 9.45)
add_opt1	MVSep Demucs4HT DNR (speech, music, effects)	Model type	
0 - Single (SDR: 9.62)
1 - Ensemble (SDR: 10.16)
add_opt1	MDX23C (vocals, instrumental)	Vocal model type	
3 - 12K FFT, Large Conv, Hop 1024 (SDR vocals: 9.95, SDR instrum: 16.26)
2 - 12K FFT, Large Conv (SDR vocals: 9.71, SDR instrum: 16.02)
0 - 12K FFT (SDR vocals: 9.68, SDR instrum: 15.99)
1 - 12K FFT, 6 Poolings (SDR vocals: 9.49, SDR instrum: 15.79)
4 - 8K FFT (SDR vocals: 10.17, SDR instrum: 16.48)
7 - 8K FFT (SDR vocals: 10.36, SDR instrum: 16.66)
add_opt1	MVSep Piano (piano, other)	Piano model type	
0 - mdx23c (2023.08, SDR: 4.79)
1 - mdx23c (2024.09, SDR: 5.59)
2 - MelRoformer (viperx, SDR: 5.71)
3 - SCNet Large (2024.09, SDR: 5.89)
4 - Ensemble (SCNet + Mel, SDR: 6.20)
5 - BS Roformer SW (SDR: 7.83)
add_opt1	MVSep Guitar (guitar, other)	Guitar model type	
0 - mdx23c (2023.08, SDR: 4.78)
2 - mdx23c (2024.06, SDR: 6.34)
3 - MelRoformer (2024.06, SDR: 7.02)
5 - BSRoformer (viperx, SDR: 7.16)
6 - Ensemble (BS + Mel, SDR: 7.51)
7 - BS Roformer SW (SDR: 9.05)
add_opt1	MDX-B Karaoke (lead/back vocals)	Karaoke model type	
0 - Extract directly from mixture (SDR lead vocals: 6.81)
1 - Extract from vocals part (SDR lead vocals: 7.94)
add_opt1	Vit Large 23 (vocals, instrum)	Model type	
0 - v1 (SDR vocals: 9.78)
1 - v2 (SDR vocals: 9.90)
add_opt1	MVSep Crowd removal (crowd, other)	Model type	
8 - MDX23C v1 (SDR crowd: 5.57)
9 - MDX23C v2 (SDR crowd: 6.06)
0 - Mel Roformer (SDR crowd: 6.07)
1 - Ensemble MDX23C + Mel Roformer (SDR crowd: 6.27)
2 - BS Roformer (SDR crowd: 7.21)
add_opt1	DrumSep (4-6 stems: kick, snare, cymbals, toms, ride, hh, crash)	Model Type	
0 - DrumSep model by inagoy (HDemucs, 4 stems)
1 - DrumSep model by aufr33 and jarredou (MDX23C, 6 stems)
2 - DrumSep SCNet XL (5 stems)
3 - DrumSep SCNet XL (6 stems)
4 - DrumSep SCNet XL (4 stems)
5 - DrumSep Ensemble of 4 models (MDX23C + 3 * SCNet XL, 8 stems)
6 - DrumSep MelBand Roformer (4 stems)
7 - DrumSep MelBand Roformer (6 stems)
add_opt1	LarsNet (kick, snare, cymbals, toms, hihat)	Model type	
0 - Apply Demucs4HT first to get drums
1 - Use as is (audio must contain drums only)
add_opt2	Ensemble (vocals, instrum)	Model Type	
1 - SDR Vocals 10.44 (MDX23C, VitLarge23, Demucs4HT)
2 - SDR Vocals 10.75 (MDX23C, BS Roformer (v1), VitLarge23)
3 - SDR Vocals 11.06 (MDX23C, BS Roformer (viperx))
4 - SDR Vocals 11.33 (MDX23C, BS Roformer (finetuned))
5 - SDR Vocals 11.50 (Mel Roformer and BS Roformer)
6 - SDR Vocals 11.61 (Mel Roformer, BS Roformer and SCNet XL)
7 - SDR Vocals 11.93 (Mel Roformer, BS Roformer (x2) and SCNet XL IHF)
8 - High Vocal Fullness (SDR: 11.69, Fullness: 20.46)
9 - High Instrumental Fullness (SDR: 17.69, Fullness: 34.79)
add_opt2	Ensemble (vocals, instrum, bass, drums, other)	Model Type	
1 - SDR average: 11.21 (v. 2023.09.01)
2 - SDR average: 11.87 (v. 2024.03.08)
3 - SDR average: 12.03 (v. 2024.03.28)
4 - SDR average: 12.17 (v. 2024.04.04)
5 - SDR average: 12.34 (v. 2024.05.21)
6 - SDR average: 12.66 (v. 2024.07.14)
7 - SDR average: 12.76 (v. 2024.08.15)
8 - SDR average: 12.84 (v. 2024.10.08)
9 - SDR average: 13.01 (v. 2024.12.20)
10 - SDR average: 13.07 (v. 2024.12.28)
11 - SDR average: 13.67 (v. 2025.06.30)
add_opt2	Ensemble All-In (vocals, bass, drums, piano, guitar, lead/back vocals, other)	Model Type	
1 - SDR average: 11.21 (v. 2023.09.01)
2 - SDR average: 11.87 (v. 2024.03.08)
3 - SDR average: 12.03 (v. 2024.03.28)
4 - SDR average: 12.17 (v. 2024.04.04)
5 - SDR average: 12.32 (v. 2024.05.21)
6 - SDR average: 12.66 (v. 2024.07.14)
7 - SDR average: 12.76 (v. 2024.08.15)
8 - SDR average: 12.84 (v. 2024.10.08)
9 - SDR average: 13.01 (v. 2024.12.20)
10 - SDR average: 13.07 (v. 2024.12.28)
11 - SDR average: 13.67 (v. 2025.06.30)
add_opt1	Whisper (extract text from audio)	Model type	
0 - Apply to original file
1 - Extract vocals first
add_opt1	Ensemble (vocals, instrum)	Output files	
0 - Standard set
1 - Include intermediate results and max_fft, min_fft
add_opt1	Ensemble (vocals, instrum, bass, drums, other)	Output files	
0 - Standard set
1 - Include intermediate results and max_fft, min_fft
add_opt1	Ensemble All-In (vocals, bass, drums, piano, guitar, lead/back vocals, other)	Output files	
0 - Standard set
1 - Include intermediate results and max_fft, min_fft
add_opt1	BS Roformer (vocals, instrumental)	Vocal model type	
3 - ver. 2024.02 (SDR vocals: 10.42, SDR instrum: 16.73)
4 - viperx edition (SDR vocals: 10.87, SDR instrum: 17.17)
5 - ver 2024.04 (SDR vocals: 11.24, SDR instrum: 17.55)
29 - ver 2024.08 (SDR vocals: 11.31, SDR instrum: 17.62)
85 - unwa high instrum fullness (SDR instrum: 17.25)
142 - unwa BS Roformer HyperACE v2 instrum (SDR instrum: 17.40)
143 - unwa BS Roformer HyperACE v2 vocals (SDR vocals: 11.39)
81 - ver 2025.07 (SDR vocals: 11.89, SDR instrum: 18.20)
add_opt1	MVSep Bass (bass, other)	Bass model type	
0 - BS Roformer (SDR bass: 12.49)
1 - HTDemucs4 (SDR bass: 12.52)
2 - SCNet XL (SDR bass: 13.81)
3 - BS + HTDemucs + SCNet (SDR bass: 14.07)
4 - BS Roformer SW (SDR bass: 14.62)
5 - BS Roformer SW + SCNet XL (SDR bass: 14.87)
add_opt2	MVSep Bass (bass, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from instrumental part
add_opt1	MVSep MultiSpeaker (MDX23C)	Model Type	
0 - Extract directly from mixture
1 - Extract from vocals part
add_opt1	MVSep Multichannel BS (vocals, instrumental)	Model Type	
0 - BS Roformer (SDR: 11.89)
1 - MDX23C (SDR: 10.36)
2 - MelBand Roformer (SDR: 11.17)
3 - MelBand Roformer XL (SDR: 11.28)
add_opt1	MVSep Drums (drums, other)	Drums model type	
0 - HTDemucs (SDR drums: 12.04)
1 - MelBand Roformer (SDR drums: 12.76)
2 - SCNet Large (SDR drums: 13.01)
3 - SCNet XL (SDR drums: 13.42)
4 - Mel + SCNet XL (SDR drums: 13.78)
5 - BS Roformer SW (SDR drums: 14.11)
6 - Mel + SCNet XL + BS Roformer SW (SDR drums: 14.35)
add_opt2	MVSep Drums (drums, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from instrumental part
add_opt1	BandIt v2 (speech, music, effects)	Model Type	
0 - Multi language model
1 - English model
2 - German model
3 - French model
4 - Spanish model
5 - Chinese model
6 - Faroese model
add_opt2	DrumSep (4-6 stems: kick, snare, cymbals, toms, ride, hh, crash)	Preprocess	
0 - Apply Drums model before
1 - Use as is (audio must contain drums only)
add_opt1	Reverb Removal (noreverb)	Model Type	
0 - Reverb removal by FoxJoy (MDX-B)
8 - Reverb removal by aufr33 and jarredou (MDX23C)
1 - Reverb removal by anvuew (MelRoformer)
2 - Reverb removal by anvuew (BSRoformer)
3 - Reverb removal by anvuew v2 (MelRoformer)
4 - Reverb removal by Sucial (MelRoformer)
5 - Reverb removal by Sucial v2 (MelRoformer)
6 - DeReverb room by anvuew (BSRoformer)
7 - DeReverb stereo by anvuew (BSRoformer)
9 - MVSep Team (2026.07, BSRoformer)
add_opt2	Reverb Removal (noreverb)	Preprocess	
0 - Extract vocals (needed for Mel/BS Roformer)
1 - Use as is
add_opt1	DeNoise by aufr33 and gabox	Model type	
0 - aufr33 (Standard)
1 - aufr33 (Aggressive)
2 - gabox
add_opt1	MelBand Roformer (vocals, instrumental)	Vocal model type	
0 - Kimberley Jensen edition (SDR vocals: 11.01, SDR instrum: 17.32)
1 - ver 2024.08 (SDR vocals: 11.17, SDR instrum: 17.48)
2 - Bas Curtiz edition (SDR vocals: 11.18, SDR instrum: 17.49)
3 - unwa Instrumental v1 (SDR vocals: 10.24, SDR instrum: 16.54)
5 - unwa Instrumental v1e (SDR vocals: 10.05, SDR instrum: 16.36)
6 - unwa big beta v5e (SDR vocals: 10.59, SDR instrum: 16.89)
4 - ver 2024.10 (SDR vocals: 11.28, SDR instrum: 17.59)
7 - becruily instrum high fullness (SDR instrum: 16.47)
8 - becruily vocals high fullness (SDR vocals: 10.55)
9 - unwa Instrumental v1e plus (SDR vocals: 10.33, SDR instrum: 16.64)
10 - gabox Instrumental v7 (SDR vocals: 10.32, SDR instrum: 16.63)
11 - becruily deux (SDR vocals: 11.35, SDR instrum: 17.66)
12 - gabox v10 flowers (SDR vocals: 10.67, SDR instrum: 16.97)
add_opt1	SCNet (vocals, instrumental)	Vocal model type	
0 - SCNet (SDR vocals: 10.25, SDR instrum: 16.56)
1 - SCNet Large (SDR vocals: 10.74, SDR instrum: 17.05)
2 - SCNet XL (SDR vocals: 10.96, SDR instrum: 17.27)
3 - SCNet XL (high fullness)
4 - SCNet XL (very high fullness)
5 - SCNet XL IHF (SDR vocals: 11.11, SDR instrum: 17.41)
6 - SCNet XL IHF (high instrum fullness by becruily)
add_opt1	MVSep Karaoke (lead/back vocals)	Karaoke model type	
0 - Model by viperx and aufr33 (SDR: 9.45)
1 - Model by becruily (SDR: 9.61)
2 - Model by gabox (SDR: 9.67)
3 - Model fuzed gabox & aufr33/viperx (SDR: 9.85)
4 - SCNet XL IHF by becruily (SDR: 9.53)
5 - BS Roformer by frazer and becruily (SDR: 10.11)
6 - BS Roformer by MVSep Team (SDR: 10.41)
7 - BS Roformer by anvuew (SDR: 10.22)
add_opt1	Aspiration (by Sucial)	Model type	
0 - Extract directly from mixture
1 - Extract from vocals part
add_opt1	Medley Vox (Multi-singer separation)	Model type	
0 - Apply to original file
1 - Extract vocals first
add_opt3	MVSep Drums (drums, other)	Output files	
0 - Standard set
1 - Include results of independent models
add_opt1	MVSep Wind (wind, other)	Wind model type	
0 - MelBand Roformer (SDR wind: 6.73)
1 - SCNet Large (SDR wind: 6.76)
2 - Mel + SCNet (SDR wind: 7.22)
3 - BS Roformer (SDR wind: 9.82)
add_opt2	MVSep Wind (wind, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from instrumental part
add_opt3	MVSep Wind (wind, other)	Output files	
0 - Standard set
1 - Include results of independent models
add_opt1	MVSep DnR v3 (speech, music, effects)	Model type	
0 - SCNet Large (SDR avg: 11.22)
1 - MelBand Roformer (SDR avg: 10.99)
2 - Mel + SCNet (SDR avg: 11.54)
add_opt2	MVSep DnR v3 (speech, music, effects)	How to extract	
0 - Extract directly from mixture
1 - Use vocals model to help
add_opt3	MVSep DnR v3 (speech, music, effects)	Output files	
0 - Standard set
1 - Include results of independent models
add_opt1	Apollo Enhancers (by JusperLee, Lew, baicai1145)	Model type	
0 - MP3 Enhancer (by JusperLee)
1 - Universal Super Resolution (by Lew)
2 - Vocals Super Resolution (by Lew)
3 - Universal Super Resolution (by MVSep Team)
4 - Universal Super Resolution (by baicai1145)
add_opt1	spleeter	Model type	
0 - 2 stems (vocals, music)
1 - 4 stems (vocals, drums, bass, other)
2 - 5 stems (vocals, drums, bass, piano, other)
add_opt1	UnMix	Model type	
0 - unmix XL (vocals, drums, bass, other)
1 - unmix HQ (vocals, drums, bass, other)
2 - unmix SD (vocals, drums, bass, other)
3 - unmix SE (vocals, music) - low quality
add_opt1	Demucs3 Model (vocals, drums, bass, other)	Model type	
0 - Demucs3 Model A (Contest Version)
1 - Demucs3 Model B (High Quality)
add_opt1	MVSep Male/Female separation	Model type	
0 - BSRoformer by Sucial (SDR: 6.52)
3 - BSRoformer by aufr33 (SDR: 8.18)
1 - SCNet XL (SDR: 11.83)
2 - MelRoformer (2025.01) (SDR: 13.03)
add_opt3	MVSep Bass (bass, other)	Output files	
0 - Standard set
1 - Include results of independent models
add_opt2	MVSep Male/Female separation	How to extract	
0 - Extract directly from mixture
1 - Extract vocals first with BS Roformer
add_opt1	MVSep Organ (organ, other)	Organ model type	
0 - SCNet XL (SDR organ: 2.71)
1 - MelBand Roformer (SDR organ: 2.77)
2 - Mel + SCNet (SDR organ: 3.05)
3 - BS Roformer (SDR organ: 5.08)
add_opt1	AudioSR (Super Resolution)	Cutoff (Hz)	
0 - Automatic
2000 - 2000
3000 - 3000
4000 - 4000
5000 - 5000
6000 - 6000
7000 - 7000
8000 - 8000
9000 - 9000
10000 - 10000
11000 - 11000
12000 - 12000
13000 - 13000
14000 - 14000
15000 - 15000
16000 - 16000
17000 - 17000
18000 - 18000
19000 - 19000
20000 - 20000
21000 - 21000
22000 - 22000
add_opt2	MVSep Karaoke (lead/back vocals)	Extraction type	
0 - Use as is
1 - Extract vocals first
add_opt1	MVSep Saxophone (saxophone, other)	Model type	
0 - SCNet XL (SDR saxophone: 6.15)
1 - MelBand Roformer (SDR saxophone: 6.97)
2 - Mel + SCNet (SDR saxophone: 7.13)
3 - BS Roformer (SDR saxophone: 9.77)
add_opt1	Stable Audio Open Gen	Text prompt	
add_opt2	Stable Audio Open Gen	Length (in seconds)	
3 - 3
5 - 5
8 - 8
10 - 10
12 - 12
15 - 15
20 - 20
25 - 25
30 - 30
35 - 35
40 - 40
45 - 45
47 - 47
add_opt2	Whisper (extract text from audio)	Transcription type	
0 - New timestamps by linto-ai
1 - Old version of timestamps by whisper
add_opt1	Parakeet (extract text from audio)	Model type	
0 - Apply to original file
1 - Extract vocals first
add_opt2	MVSep Acoustic Guitar (acoustic-guitar, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from guitar part
add_opt2	MVSep Flute (flute, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt1	MVSep Flute (flute, other)	Flute model type	
0 - SCNet XL (SDR flute: 6.27)
1 - BS Roformer (SDR flute: 9.46)
add_opt1	MVSep Bowed Strings (strings, other)	String model type	
0 - MDX23C (SDR strings: 3.84)
1 - BS Roformer (SDR strings: 5.41)
add_opt2	MVSep Bowed Strings (strings, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from instrumental part
add_opt2	MVSep Viola (viola, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from strings part
add_opt2	MVSep Cello (cello, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from strings part
add_opt2	MVSep Trumpet (trumpet, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt2	MVSep Double Bass (double-bass, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from strings part
add_opt2	MVSep Trombone (trombone, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt2	Apollo Enhancers (by JusperLee, Lew, baicai1145)	Cutoff (Hz)	
0 - No cutoff
2000 - 2000
3000 - 3000
4000 - 4000
5000 - 5000
6000 - 6000
7000 - 7000
8000 - 8000
9000 - 9000
10000 - 10000
11000 - 11000
12000 - 12000
13000 - 13000
14000 - 14000
15000 - 15000
16000 - 16000
17000 - 17000
18000 - 18000
19000 - 19000
20000 - 20000
21000 - 21000
22000 - 22000
add_opt2	MVSep Digital Piano (digital-piano, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from piano part
add_opt2	MVSep Oboe (oboe, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt2	MVSep Clarinet (clarinet, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt2	MVSep Electric Guitar (electric-guitar, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from guitar part
add_opt2	MVSep French Horn (french-horn, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt2	MVSep Harmonica (harmonica, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt1	MVSep Lead/Rhythm Guitar (lead-guitar, rhythm-guitar)	Model type	
0 - Two-stage model (SDR: 9.21)
1 - One-stage model (SDR: 9.02)
add_opt1	SOME (Singing-Oriented MIDI Extractor)	How to use	
0 - Apply to original file
1 - Extract vocals first
add_opt1	VibeVoice (Voice Cloning)	Model type	
0 - VibeVoce 1.5B (Small)
1 - VibeVoce 7B (Large)
add_opt2	VibeVoice (Voice Cloning)	Text prompt	
add_opt3	VibeVoice (Voice Cloning)	Extract vocals first	
0 - Use original reference file
1 - Extract vocals first
add_opt1	VibeVoice (TTS)	Model type	
0 - VibeVoce 1.5B (Small)
1 - VibeVoce 7B (Large)
add_opt2	VibeVoice (TTS)	Text prompt	
add_opt1	MVSep Brass (brass, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt1	MVSep Woodwind (woodwind, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt1	MVSep Synth (synth, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from instrumental part
add_opt2	MVSep Celesta (celesta, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from percussion part
add_opt2	MVSep Xylophone (xylophone, other)	How to extract	
0 - Extract directly from mixture
1 - Extract from percussion part
add_opt2	MVSep Choir (choir, other)	How to extract	
0 - Extract directly from mixture
1 - Extract vocals first
add_opt2	MVSep SATB Choir (soprano, alto, tenor, bass)	How to extract	
0 - Extract directly from mixture
1 - Extract vocals first
add_opt1	MVSep SATB Choir (soprano, alto, tenor, bass)	Model type	
2 - SCNet Masked (SDR: 4.07)
3 - BS Roformer (SDR: 7.39)
add_opt1	Transkun (Piano -> MIDI)	How to extract	
0 - Extract directly from mixture
1 - Extract piano first
add_opt2	Parakeet (extract text from audio)	Version	
0 - Parakeet v2
1 - Parakeet v3
add_opt1	Bark (Speech Gen)	Text prompt	
add_opt2	Bark (Speech Gen)	Speaker	
en_0 - English Male 1
en_1 - English Male 2
en_2 - English Male 3
en_3 - English Male 4
en_4 - English Male 5
en_5 - English Male 6 (Grainy)
en_6 - English Male 7 (Best)
en_7 - English Male 8
en_8 - English Male 9
en_9 - English Female 1
ru_0 - Russian Male 1
ru_1 - Russian Male 2 (Echoes)
ru_2 - Russian Male 3 (Echoes)
ru_3 - Russian Male 4
ru_4 - Russian Male 5
ru_7 - Russian Male 6
ru_8 - Russian Male 7 (Grainy)
ru_5 - Russian Female 1
ru_6 - Russian Female 2 (Grainy)
ru_9 - Russian Female 3 (Grainy)
de_0 - German Male
de_1 - German Male
de_2 - German Male
de_3 - German Female
de_4 - German Male
de_5 - German Male
de_6 - German Male
de_7 - German Male
de_8 - German Female
de_9 - German Male
es_0 - Spanish Male
es_1 - Spanish Male
es_2 - Spanish Male (Noise)
es_3 - Spanish Male (Noise)
es_4 - Spanish Male
es_5 - Spanish Male (Noise)
es_6 - Spanish Male
es_7 - Spanish Male
es_8 - Spanish Female
es_9 - Spanish Female
fr_0 - French Male
fr_1 - French Female
fr_2 - French Female
fr_3 - French Male
fr_4 - French Male
fr_5 - French Female
fr_6 - French Male
fr_7 - French Male
fr_8 - French Male
fr_9 - French Male (Auditorium)
hi_0 - Hindi Female
hi_1 - Hindi Female (Noise)
hi_2 - Hindi Male
hi_3 - Hindi Female
hi_4 - Hindi Female (Noise)
hi_5 - Hindi Male
hi_6 - Hindi Male
hi_7 - Hindi Male
hi_8 - Hindi Male
hi_9 - Hindi Female
it_0 - Italian Male
it_1 - Italian Male
it_2 - Italian Female
it_3 - Italian Male
it_4 - Italian Male (Best)
it_5 - Italian Male
it_6 - Italian Male
it_7 - Italian Female
it_8 - Italian Male
it_9 - Italian Female
ja_0 - Japanese Female
ja_1 - Japanese Female (Noise)
ja_2 - Japanese Male
ja_3 - Japanese Female
ja_4 - Japanese Female
ja_5 - Japanese Female
ja_6 - Japanese Male
ja_7 - Japanese Female
ja_8 - Japanese Female
ja_9 - Japanese Female
ko_0 - Korean Female
ko_1 - Korean Male
ko_2 - Korean Male
ko_3 - Korean Male
ko_4 - Korean Male
ko_5 - Korean Male
ko_6 - Korean Male
ko_7 - Korean Male
ko_8 - Korean Male
ko_9 - Korean Male
pl_0 - Polish Male
pl_1 - Polish Male
pl_2 - Polish Male
pl_3 - Polish Male
pl_4 - Polish Female
pl_5 - Polish Male
pl_6 - Polish Female
pl_7 - Polish Male
pl_8 - Polish Male
pl_9 - Polish Female
pt_0 - Portugues Male
pt_1 - Portugues Male
pt_2 - Portugues Male
pt_3 - Portugues Male
pt_4 - Portugues Male
pt_5 - Portugues Male
pt_6 - Portugues Male (Noise)
pt_7 - Portugues Male
pt_8 - Portugues Male
pt_9 - Portugues Male
tr_0 - Turkish Male
tr_1 - Turkish Male
tr_2 - Turkish Male
tr_3 - Turkish Male
tr_4 - Turkish Female
tr_5 - Turkish Female
tr_6 - Turkish Male
tr_7 - Turkish Male (Grainy)
tr_8 - Turkish Male
tr_9 - Turkish Male
zh_0 - Chinese Male
zh_1 - Chinese Male
zh_2 - Chinese Male
zh_3 - Chinese Male
zh_4 - Chinese Female
zh_5 - Chinese Male
zh_6 - Chinese Female (Noise)
zh_7 - Chinese Female
zh_8 - Chinese Male
zh_9 - Chinese Female
add_opt2	MVSep Bagpipes (bagpipes , other)	How to extract	
0 - Extract directly from mixture
1 - Extract from wind part
add_opt1	Qwen3-TTS (Custom Voice)	Text prompt	
add_opt2	Qwen3-TTS (Custom Voice)	Speaker	
aiden - Aiden (English)
ryan - Ryan (English)
sohee - Sohee (Korean)
ono_anna - Ono Anna (Japanese)
serena - Serena (Chinese)
uncle_fu - Uncle Fu (Chinese)
vivian - Vivian (Chinese)
dylan - Dylan (Chinese Beijing Dialect)
eric - Eric (Chinese Sichuan Dialect)
add_opt3	Qwen3-TTS (Custom Voice)	Language	
auto - Auto
english - English
russian - Russian
chinese - Chinese
french - French
german - German
italian - Italian
japanese - Japanese
korean - Korean
portuguese - Portuguese
spanish - Spanish
add_opt4	Qwen3-TTS (Custom Voice)	Voice description	
add_opt1	Qwen3-TTS (Voice Design)	Text prompt	
add_opt2	Qwen3-TTS (Voice Design)	Voice description	
add_opt3	Qwen3-TTS (Voice Design)	Language	
auto - Auto
english - English
russian - Russian
chinese - Chinese
french - French
german - German
italian - Italian
japanese - Japanese
korean - Korean
portuguese - Portuguese
spanish - Spanish
add_opt1	Qwen3-TTS (Voice Cloning)	Text prompt	
add_opt2	Qwen3-TTS (Voice Cloning)	Reference text in audio (optional)	
add_opt3	Qwen3-TTS (Voice Cloning)	Language	
auto - Auto
english - English
russian - Russian
chinese - Chinese
french - French
german - German
italian - Italian
japanese - Japanese
korean - Korean
portuguese - Portuguese
spanish - Spanish
add_opt4	Qwen3-TTS (Voice Cloning)	Extract vocals first	
0 - Use original reference file
1 - Extract vocals first
add_opt1	HeartMuLa (Song Gen)	Lyrics	
add_opt2	HeartMuLa (Song Gen)	Tags (optional)	
add_opt3	HeartMuLa (Song Gen)	Genre	
--- - ---
pop - Pop
hip-hop - Hip-hop
rock - Rock
electronic - Electronic
latin - Latin
r&b - R&B
classical - Classical
jazz - Jazz
metal - Metal
country - Country
rap - Rap
edm - EDM
reggaeton - Reggaeton
k-pop - K-pop
house - House
techno - Techno
alternative rock - Alternative rock
indie - Indie
soul - Soul
blues - Blues
reggae - Reggae
afrobeats - Afrobeats
folk - Folk
ambient - Ambient
lo-fi - Lo-fi
trap - Trap
dance pop - Dance pop
indie pop - Indie pop
dubstep - Dubstep
drum and bass - Drum and bass
trance - Trance
synthwave - Synthwave
punk - Punk
hard rock - Hard rock
heavy metal - Heavy metal
nu metal - Nu metal
grunge - Grunge
funk - Funk
disco - Disco
soundtrack - Soundtrack
cinematic - Cinematic
orchestral - Orchestral
acoustic - Acoustic
gospel - Gospel
drill - Drill
boom bap - Boom bap
uk garage - UK garage
grime - Grime
electro - Electro
breakbeat - Breakbeat
trip-hop - Trip-hop
future bass - Future bass
hardstyle - Hardstyle
industrial - Industrial
idm - IDM
hyperpop - Hyperpop
vaporwave - Vaporwave
pop punk - Pop punk
metalcore - Metalcore
death metal - Death metal
black metal - Black metal
symphonic metal - Symphonic metal
post-punk - Post-punk
psychedelic rock - Psychedelic rock
progressive rock - Progressive rock
emo - Emo
shoegaze - Shoegaze
post-rock - Post-rock
garage rock - Garage rock
math rock - Math rock
bossa nova - Bossa nova
samba - Samba
dancehall - Dancehall
ska - Ska
amapiano - Amapiano
j-pop - J-pop
americana - Americana
bluegrass - Bluegrass
neo soul - Neo soul
smooth jazz - Smooth jazz
swing - Swing
bebop - Bebop
fusion - Fusion
arabic - Arabic
indian - Indian
celtic - Celtic
balkan - Balkan
avant-garde - Avant-garde
experimental - Experimental
new age - New age
baroque - Baroque
romantic - Romantic
minimalism - Minimalism
a cappella - A cappella
choral - Choral
mathcore - Mathcore
screamo - Screamo
big band - Big band
motown - Motown
chillout - Chillout
world music - World music
add_opt4	HeartMuLa (Song Gen)	Timbre	
--- - ---
clean - Clean
distorted - Distorted
acoustic - Acoustic
synthetic - Synthetic
bright - Bright
dark - Dark
warm - Warm
cold - Cold
soft - Soft
hard - Hard
heavy - Heavy
light - Light
dry - Dry
wet - Wet
smooth - Smooth
rough - Rough
thick - Thick
thin - Thin
wide - Wide
narrow - Narrow
deep - Deep
full - Full
punchy - Punchy
muffled - Muffled
boomy - Boomy
airy - Airy
lo-fi - Lo-fi
saturated - Saturated
harsh - Harsh
mellow - Mellow
rich - Rich
dull - Dull
hollow - Hollow
tight - Tight
loose - Loose
spacious - Spacious
echoing - Echoing
resonant - Resonant
organic - Organic
metallic - Metallic
wooden - Wooden
breathy - Breathy
raspy - Raspy
husky - Husky
whispery - Whispery
gravelly - Gravelly
throaty - Throaty
nasal - Nasal
guttural - Guttural
wailing - Wailing
brassy - Brassy
crunchy - Crunchy
fuzzy - Fuzzy
gritty - Gritty
grainy - Grainy
crispy - Crispy
buzzing - Buzzing
droning - Droning
ringing - Ringing
piercing - Piercing
shrill - Shrill
tinny - Tinny
biting - Biting
bass-heavy - Bass-heavy
midrangey - Midrangey
trebly - Trebly
harmonic - Harmonic
inharmonic - Inharmonic
pure - Pure
complex - Complex
modulated - Modulated
detuned - Detuned
phasey - Phasey
boxy - Boxy
dead - Dead
muted - Muted
squelchy - Squelchy
fizzy - Fizzy
hazy - Hazy
diffuse - Diffuse
papery - Papery
plastic - Plastic
rubbery - Rubbery
glassy - Glassy
creamy - Creamy
silky - Silky
velvety - Velvety
brilliant - Brilliant
aggressive - Aggressive
gentle - Gentle
soothing - Soothing
sparse - Sparse
shallow - Shallow
add_opt5	HeartMuLa (Song Gen)	Gender	
--- - ---
male - Male
female - Female
add_opt6	HeartMuLa (Song Gen)	Mood	
--- - ---
happy - Happy
sad - Sad
energetic - Energetic
relaxing - Relaxing
dark - Dark
upbeat - Upbeat
chill - Chill
calm - Calm
joyful - Joyful
melancholic - Melancholic
uplifting - Uplifting
romantic - Romantic
tense - Tense
epic - Epic
aggressive - Aggressive
dramatic - Dramatic
playful - Playful
peaceful - Peaceful
dreamy - Dreamy
eerie - Eerie
mysterious - Mysterious
hopeful - Hopeful
nostalgic - Nostalgic
angry - Angry
soothing - Soothing
cheerful - Cheerful
emotional - Emotional
intense - Intense
suspenseful - Suspenseful
gloomy - Gloomy
somber - Somber
gentle - Gentle
mellow - Mellow
serene - Serene
exciting - Exciting
fun - Fun
groovy - Groovy
lively - Lively
driving - Driving
bouncy - Bouncy
triumphant - Triumphant
motivational - Motivational
euphoric - Euphoric
ethereal - Ethereal
meditative - Meditative
laid-back - Laid-back
tranquil - Tranquil
depressing - Depressing
sorrowful - Sorrowful
mournful - Mournful
heartbreaking - Heartbreaking
bittersweet - Bittersweet
touching - Touching
scary - Scary
creepy - Creepy
ominous - Ominous
fierce - Fierce
frantic - Frantic
anxious - Anxious
restless - Restless
nervous - Nervous
haunting - Haunting
sexy - Sexy
sensual - Sensual
quirky - Quirky
weird - Weird
hypnotic - Hypnotic
majestic - Majestic
grand - Grand
reflective - Reflective
pensive - Pensive
introspective - Introspective
soulful - Soulful
funky - Funky
add_opt7	HeartMuLa (Song Gen)	Instrument	
--- - ---
piano - Piano
synthesizer - Synthesizer
electric guitar - Electric guitar
acoustic guitar - Acoustic guitar
bass - Bass
bass guitar - Bass guitar
drums - Drums
drum machine - Drum machine
percussion - Percussion
strings - Strings
violin - Violin
keyboard - Keyboard
saxophone - Saxophone
trumpet - Trumpet
cello - Cello
flute - Flute
organ - Organ
electric piano - Electric piano
double bass - Double bass
brass - Brass
woodwinds - Woodwinds
trombone - Trombone
clarinet - Clarinet
viola - Viola
french horn - French horn
tuba - Tuba
oboe - Oboe
bassoon - Bassoon
piccolo - Piccolo
accordion - Accordion
ukulele - Ukulele
banjo - Banjo
mandolin - Mandolin
harp - Harp
harpsichord - Harpsichord
celesta - Celesta
kick drum - Kick drum
snare drum - Snare drum
cymbals - Cymbals
hi-hat - Hi-hat
toms - Toms
tambourine - Tambourine
shaker - Shaker
congas - Congas
bongos - Bongos
cowbell - Cowbell
marimba - Marimba
xylophone - Xylophone
vibraphone - Vibraphone
glockenspiel - Glockenspiel
timpani - Timpani
tabla - Tabla
taiko - Taiko
sitar - Sitar
lute - Lute
fiddle - Fiddle
erhu - Erhu
duduk - Duduk
shakuhachi - Shakuhachi
recorder - Recorder
sampler - Sampler
turntables - Turntables
theremin - Theremin
add_opt8	HeartMuLa (Song Gen)	Scene	
--- - ---
party - Party
dance - Dance
workout - Workout
relax - Relax
study - Study
sleep - Sleep
focus - Focus
background - Background
driving - Driving
cinematic - Cinematic
gaming - Gaming
meditation - Meditation
club - Club
lounge - Lounge
commuting - Commuting
working - Working
coding - Coding
reading - Reading
yoga - Yoga
gym - Gym
running - Running
cooking - Cooking
cleaning - Cleaning
dating - Dating
romantic dinner - Romantic dinner
late night - Late night
road trip - Road trip
cafe - Cafe
bar - Bar
nature - Nature
morning - Morning
evening - Evening
soundtrack - Soundtrack
trailer - Trailer
vlog - Vlog
commercial - Commercial
podcast - Podcast
video game - Video game
film - Film
anime - Anime
corporate - Corporate
presentation - Presentation
wedding - Wedding
festival - Festival
holiday - Holiday
summer - Summer
winter - Winter
christmas - Christmas
halloween - Halloween
add_opt9	HeartMuLa (Song Gen)	Region	
--- - ---
western - Western
latin - Latin
african - African
asian - Asian
middle eastern - Middle Eastern
european - European
caribbean - Caribbean
k-pop - K-pop
j-pop - J-pop
c-pop - C-pop
bollywood - Bollywood
celtic - Celtic
nordic - Nordic
balkan - Balkan
slavic - Slavic
mediterranean - Mediterranean
arabic - Arabic
indian - Indian
native american - Native American
indigenous - Indigenous
romani - Romani
klezmer - Klezmer
american - American
british - British
french - French
spanish - Spanish
italian - Italian
german - German
irish - Irish
scottish - Scottish
jamaican - Jamaican
cuban - Cuban
brazilian - Brazilian
mexican - Mexican
andean - Andean
hawaiian - Hawaiian
polynesian - Polynesian
australian - Australian
persian - Persian
turkish - Turkish
greek - Greek
west african - West African
south african - South African
east asian - East Asian
south asian - South Asian
southeast asian - Southeast Asian
eastern european - Eastern European
scandinavian - Scandinavian
appalachian - Appalachian
cajun - Cajun
afro-cuban - Afro-cuban
afro-brazilian - Afro-brazilian
add_opt10	HeartMuLa (Song Gen)	Topic	
--- - ---
love - Love
heartbreak - Heartbreak
romance - Romance
breakup - Breakup
desire - Desire
infatuation - Infatuation
betrayal - Betrayal
life - Life
death - Death
friendship - Friendship
family - Family
growing up - Growing up
youth - Youth
aging - Aging
nostalgia - Nostalgia
loneliness - Loneliness
grief - Grief
mental health - Mental health
depression - Depression
anxiety - Anxiety
hope - Hope
motivation - Motivation
empowerment - Empowerment
self-love - Self-love
overcoming - Overcoming
success - Success
failure - Failure
party - Party
money - Money
wealth - Wealth
hustle - Hustle
drinking - Drinking
drugs - Drugs
addiction - Addiction
crime - Crime
violence - Violence
revenge - Revenge
cars - Cars
fashion - Fashion
society - Society
politics - Politics
protest - Protest
rebellion - Rebellion
war - War
peace - Peace
injustice - Injustice
freedom - Freedom
religion - Religion
spirituality - Spirituality
faith - Faith
nature - Nature
space - Space
ocean - Ocean
summer - Summer
winter - Winter
spring - Spring
autumn - Autumn
travel - Travel
home - Home
storytelling - Storytelling
fantasy - Fantasy
sci-fi - Sci-fi
horror - Horror
mythology - Mythology
comedy - Comedy
parody - Parody
instrumental - Instrumental
add_opt1	Phantom Centre extraction	Model type	
0 - Phantom Centre by wesleyr36 (MDX23C)
1 - Phantom Centre by gilliaan (BSRoformer)
2 - Phantom Centre by gilliaan (mdx23c)
add_opt1	BS PolarFormer (vocals, instrumental)	Model type	
158 - BS PolarFormer (62 bands, SDR: 11.75)
163 - BS PolarFormer (124 bands, SDR: 12.02)
add_opt2	BS Roformer (vocals, instrumental)	Overlap	
2 - 50%
8 - 87.5%
add_opt2	MelBand Roformer (vocals, instrumental)	Overlap	
2 - 50%
8 - 87.5%
add_opt2	BS PolarFormer (vocals, instrumental)	Overlap	
2 - 50%
8 - 87.5%
add_opt1	ADTOF Plus (Drums -> MIDI)	How to extract	
0 - Extract directly from mixture
1 - Extract drums first
add_opt2	MVSep Multichannel BS (vocals, instrumental)	Processing Mode	
0 - Per-Channel
1 - Stereo Pairs
输出格式 (output_format) 值
名称	值
mp3 (320 kbps)	0
wav (uncompressed, 16 bit)	1
flac (lossless, 16 bit)	2
m4a (lossy)	3
wav (uncompressed, 32 bit)	4
flac (lossless, 24 bit)	5
Curl示例代码:
curl --location --request POST 'https://mvsep.com/api/separation/create' --form 'audiofile=@"/path/to/file.mp3"' --form 'api_token="EWyT1L3yAWlEWTcjYuoqCKmEH4G7or"' --form 'sep_type="9"' --form 'add_opt1="0"' --form 'add_opt2="1"' --form 'output_format="1"' --form 'is_demo="1"'

响应详情：:
键	值
success	
false - 当创建作业失败时
true - 成功创建作业后
data	根据 success 键保存额外信息
data -> link	显示已创建作业的 “获取结果” URL 的链接（仅在 success 为 true 时显示）
data -> hash	显示已创建的任务哈希值（仅在 success 为 true 时显示）
data -> message	显示错误描述（仅在success为false时显示）
获取结果
要获取分离结果，需要对以下网址进行 GET 调用：
https://mvsep.com/api/separation/get


查询参数
字段	类型	说明
hash	String	此分离的哈希值
Curl示例代码:
curl --location --request GET 'https://mvsep.com/api/separation/get?hash=20230327071601-0e3e5c6c85-13-dimensions.mp3'

响应详情：:
键	值
success	
false - 当文件哈希未找到、被删除或已过期
true - 当文件哈希值找到且有效
status	
not_found - 当作业无效时
waiting - 当作业处于队列中且尚未处理时
processing - 当作业正在处理时
done - 当作业已成功处理
failed - 当作业处理失败时
distributing - 当作业中的音频文件较大且正在分发到多个 GPU 实例时
merging - 当所有 Job 分配部分完成处理并合并时
data	根据 status 键保存额外信息
data -> queue_count	在用户的优先级中，显示未处理的作业计数（仅在 status 为 waiting 或 distributing 时显示）
data -> current_order	显示用户作业的顺序（仅在status为wating或distributing时显示）
data -> message	显示状态描述（显示在所有状态上，当 status 为 failed） 时显示错误原因）
data -> algorithm	显示作业中使用的算法（仅在 status 为 done 时显示）
data -> algorithm_description	显示作业中使用的算法详细信息（仅在 status 为 done 时显示）
data -> output_format	显示作业的输出格式（仅在 status 为 done 时显示）
data -> tags	显示音频元标记（仅在 status 为 done 时显示）
data -> input_file	显示输入音频下载详情（仅当 status 为 done 时显示）
data -> files	显示输出音频下载详情（仅在 status 为 done 时显示）
data -> date	显示作业处理日期（仅在 status 为 done 时显示）
data -> finished_chunks	显示大型作业的已完成部分的数量（仅在 status 为 distributing 时显示）
data -> all_chunks	显示大型作业的所有部分的编号（仅在 status 为 distributing 时显示）
错误
MVSEP API 使用以下错误代码：

错误代码	含义
400	有些参数未知或无效。当您没有传入每个必需的参数，或传入了无效参数时，会出现这个错误。
401	未知或无效的api_token。如果您使用了未知的API密钥，则会出现此错误。