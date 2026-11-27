# videomaking

## 프로젝트

| 폴더 | 내용 |
| --- | --- |
| [`hiker-tumble/`](hiker-tumble/) | **초고속 하산 ~ 데굴산 등반기 ~** — 등산객이 정상에서 굴러 떨어지는 62초 3D 코미디 애니메이션 (한국어 대사 + 자막). Remotion + React Three Fiber, Supertonic TTS, Whisper. 결과물: [`hiker-tumble/renders/hiker-tumble.mp4`](hiker-tumble/renders/hiker-tumble.mp4) |
| [`reels-snooze/`](reels-snooze/) | **알람 5개도 못 이기는 사람 특** — 24초 세로형(9:16) 릴스. 알람 5개를 다 버티다 지각인 줄 알고 뛰쳐나갔더니 토요일. 150 BPM 오리지널 배경음악에 맞춘 컷, 무음 시청용 자막, 무한 반복 구조, 커버 포함. 결과물: [`reels-snooze/renders/snooze-reel.mp4`](reels-snooze/renders/snooze-reel.mp4) |

## 자동 푸시 (Claude Code)

이 저장소에서 Claude Code가 커밋하면 `.claude/hooks/push-to-main.sh` 훅이 곧바로 `origin/main`에 푸시합니다. 강제 푸시는 하지 않으며, `main`이 앞서 나가 있으면 푸시를 멈추고 Claude에게 알려 병합 후 다시 올리게 합니다. 끄려면 `.claude/settings.json`에서 해당 훅을 지우거나 `/hooks` 메뉴에서 비활성화하세요.
