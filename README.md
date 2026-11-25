# videomaking

## 프로젝트

| 폴더 | 내용 |
| --- | --- |
| [`hiker-tumble/`](hiker-tumble/) | **초고속 하산 ~ 데굴산 등반기 ~** — 등산객이 정상에서 굴러 떨어지는 62초 3D 코미디 애니메이션 (한국어 대사 + 자막). Remotion + React Three Fiber, Supertonic TTS, Whisper. 결과물: [`hiker-tumble/renders/hiker-tumble.mp4`](hiker-tumble/renders/hiker-tumble.mp4) |

## 자동 푸시 (Claude Code)

이 저장소에서 Claude Code가 커밋하면 `.claude/hooks/push-to-main.sh` 훅이 곧바로 `origin/main`에 푸시합니다. 강제 푸시는 하지 않으며, `main`이 앞서 나가 있으면 푸시를 멈추고 Claude에게 알려 병합 후 다시 올리게 합니다. 끄려면 `.claude/settings.json`에서 해당 훅을 지우거나 `/hooks` 메뉴에서 비활성화하세요.
