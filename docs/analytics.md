# 방문 통계와 배포 설정

`main` 반영 시와 매일 10:00 KST(01:00 UTC)에 Pages 배포 워크플로가 실행됩니다. GA4 연결 전에는 `public/stats.json`의 미집계 상태를 배포합니다. 연결 후에는 GA4 조회가 실패할 경우 배포를 중단하므로 잘못된 숫자로 기존 사이트를 덮어쓰지 않습니다.

1. 새 GA4 속성과 웹 데이터 스트림을 만들고 속성의 **보고 시간대**를 `Asia/Seoul`로 설정합니다. 속성 ID는 숫자이고 측정 ID는 `G-`로 시작합니다.
2. 웹 데이터 스트림의 **향상된 측정 → 페이지 조회수 → 고급 설정**에서 **브라우저 기록 이벤트를 기반으로 한 페이지 변경**을 끕니다. 사이트는 `send_page_view: false`를 설정하고 라우트 전환마다 `page_view`를 직접 한 번 전송합니다. 두 자동 기록 중 하나라도 남으면 중복 집계될 수 있습니다.
3. Google Cloud 프로젝트에서 **Google Analytics Data API**를 사용 설정합니다. 서비스 계정을 만들고 GA4 속성 접근 관리에서 이 계정에 **뷰어** 권한을 부여합니다. GitHub OIDC용 Workload Identity Federation 공급자를 `rootachieve/rootachieve.github.io` 저장소의 `main` 브랜치로 제한하고, 서비스 계정에 해당 주체의 **Workload Identity User** 권한을 부여합니다. JSON 키를 GitHub에 올리지 않습니다.
4. GitHub 저장소의 **Settings → Secrets and variables → Actions → Variables**에 `GA4_PROPERTY_ID`, `GA4_MEASUREMENT_ID`, `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`을 설정합니다. `GCP_WIF_PROVIDER`는 `projects/숫자/locations/global/workloadIdentityPools/이름/providers/이름` 형식입니다. 네 변수가 모두 있어야 통계 조회가 실행됩니다.
5. 저장소 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 선택합니다. `main`에서 워크플로를 한 번 실행한 뒤 `/graph/`와 `/posts/1/` 직접 접근을 확인합니다.

통계 스냅샷의 `visitorDate`는 실제 조회한 전날 날짜입니다. `totalVisitors`와 `yesterdayVisitors`는 GA4 `totalUsers`, 글별 `postViews`는 `/posts/{id}/` 경로의 `screenPageViews`입니다. 아직 GA4 행이 없는 값은 `null` 또는 누락으로 남겨 미집계 상태로 표시합니다. 수치에는 당일 실시간 조회수가 포함되지 않습니다.

설정 근거: [GA4 지표와 경로 차원](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), [페이지 조회수 수동 기록](https://developers.google.com/analytics/devguides/collection/ga4/views), [GitHub OIDC로 Google Cloud 인증](https://github.com/google-github-actions/auth#setting-up-workload-identity-federation), [GitHub Pages 맞춤 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
