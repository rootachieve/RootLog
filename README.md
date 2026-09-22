# RootLog

Markdown으로 기록하고 글 사이의 관계를 그래프로 탐색하는 개인 기술 블로그입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

검증은 `npm test`, 타입 검사는 `npm run check`, 배포 산출물은 `npm run build`로 생성합니다.

## 글 추가

1. `content/posts/`에 Markdown 파일을 추가합니다.
2. `content/posts.json`에 고유한 숫자 ID와 제목, 발행일, 요약, 설명, 대표 이미지, 태그, 카테고리, 키워드, 파일명을 기록합니다.
3. 연결할 글이 있으면 `content/relations.json`에 `from`, `to`, `relation`, `weight`를 기록합니다. `weight`는 0부터 1 사이입니다.
4. `npm test && npm run build`로 파일과 관계를 검증합니다.

본문의 1~3단계 제목은 상세 화면 목차에 표시됩니다. 같은 제목이 반복돼도 서로 다른 앵커가 생성됩니다.

## 배포와 통계

`main`에 반영되면 GitHub Actions가 테스트와 빌드를 실행하고 GitHub Pages에 배포합니다. GA4와 GitHub OIDC 연결 방법은 [통계 설정 문서](docs/analytics.md)에 정리되어 있습니다. GA4가 연결되지 않은 동안 방문 통계는 미집계 상태로 표시됩니다.
