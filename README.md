# MusicBox (오르골 PWA)

오프라인에서도 동작하는 오르골 작곡/연주 앱입니다.

## 주요 기능

- PWA: 안드로이드에서 설치 후 서버 연결 없이 실행 가능
- 연주 페이지
  - 곡 선택
  - 속도(BPM) 변경
  - 음색(파형) 변경
  - 재생/정지/반복
- 편집 페이지
  - 곡 선택
  - 새 곡 추가, 이름 변경, 삭제
  - 펀치 롤 스타일 편집기에서 노트 추가/삭제
  - Shift + 노트 클릭으로 노트 길이 1스텝 연장
  - 총 스텝 수 변경
- 저장 영속성
  - 로컬 스토리지에 자동 저장
  - 앱 종료 후에도 곡 유지
- 화음/아르페지오
  - 여러 음 동시 재생 지원
  - 음별 시작 시점/길이 독립 설정 가능

## 로컬 실행

정적 파일만으로 동작합니다.

1. 이 폴더를 정적 서버로 실행
2. 브라우저에서 열기

예시(원하는 도구 사용 가능):

```bash
npx serve .
```

## GitHub 자동 배포 (push 시)

`.github/workflows/deploy.yml`이 포함되어 있어 `main` 브랜치로 push하면 GitHub Pages로 자동 배포됩니다.

필수 설정:

1. GitHub 저장소 `Settings > Pages` 이동
2. `Build and deployment`에서 `Source`를 `GitHub Actions`로 설정
3. `main` 브랜치에 push

배포 후 URL은 Actions의 Deploy 단계 또는 Pages 설정 화면에서 확인할 수 있습니다.

## 파일 구성

- `index.html`: 앱 UI
- `styles.css`: 오르골/롤페이퍼 스타일
- `app.js`: 곡 관리, 편집기, 재생 엔진(WebAudio), 저장
- `manifest.webmanifest`: PWA 메타데이터
- `sw.js`: 오프라인 캐시 서비스워커
- `.github/workflows/deploy.yml`: GitHub Pages 자동 배포 워크플로
