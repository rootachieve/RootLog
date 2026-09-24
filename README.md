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
코드 블록은 여는 펜스에 `ts`, `json`, `bash`처럼 언어를 적으면 문법별로 강조됩니다. 언어를 적지 않은 블록은 일반 코드로 표시됩니다.

현재 등록된 글은 없습니다. 새 글을 추가하면 목록과 관계 그래프에 표시됩니다.

## 배포와 통계

`main`에 반영되면 GitHub Actions가 테스트와 빌드를 실행하고 GitHub Pages에 배포합니다. GA4와 GitHub OIDC 연결 방법은 [통계 설정 문서](docs/analytics.md)에 정리되어 있습니다. GA4가 연결되지 않은 동안 방문 통계는 미집계 상태로 표시됩니다.

## AI 글 검수와 콘텐츠 생성

저장소 설정에 `OPENAI_API_KEY` Actions secret과 `OPENAI_MODEL` Actions variable을 등록하면 두 자동화가 동작합니다. `OPENAI_MODEL`에는 Responses API의 Structured Outputs를 지원하는 모델을 지정합니다.

- PR을 열거나 갱신하면 변경된 Markdown 글의 팩트체크, 오탈자, 용어 통일, 구성, 완성도, 설명 깊이와 빠진 근거·예시·결론을 검토해 하나의 PR 댓글을 갱신합니다.
- PR이 `main`에 병합되면 새 글의 메타데이터와 AI 요약을 만들고, 기존 글 전체와 비교해 연결 강도와 관계 종류를 생성합니다.
- 생성된 `content/posts.json`과 `content/relations.json`은 검증 후 `github-actions[bot]`이 `main`에 커밋합니다.
- 전체 글과 관계를 바탕으로 다음 학습·작성 주제 3개를 해당 PR의 GitHub 이슈로 생성합니다.

`pull_request_target` 워크플로는 PR 브랜치의 코드를 실행하지 않습니다. 자동화 스크립트는 `main`에서 가져오고 검수할 Markdown만 GitHub API로 읽습니다.
