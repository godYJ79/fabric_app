# Fabric Apps (Preview) / Rayfin SDK 정리 (정정본)

작성일: 2026-11-09 · 최종 갱신: 2026-11-13
목적: Microsoft Learn 원문과 **설치된 Rayfin 패키지(1.36.2)에 포함된 문서**를 확인하고, 실제로 만들어 배포하며 겪은 결과를 정리한 인수인계 문서.
표기: **[문서]** 문서에서 확인 / **[실측]** 실제 환경(Windows PC, Fabric_testbox 워크스페이스)에서 확인 / **[추정]** 문서에 없는 해석·아이디어 / **[미확인]** 아직 확인되지 않음
문서 우선순위: Learn 문서와 **설치된 패키지 문서(`node_modules/@microsoft/rayfin-*/assets/docs`)가 다르면 설치된 쪽을 따른다**(버전이 일치하므로). 예: 커스텀 역할은 Learn에 언급되지만 설치 문서는 "내장 역할 2개만 지원"이라고 한다.
주의: 명령어·설정 키는 CLI 버전(1.36.2)에 따라 다를 수 있다. 실행 전 `npx rayfin <command> --help`로 확인할 것.
코드 위치: 앱 코드는 같은 저장소의 `app/skeleton` 브랜치, 이 문서는 `docs/fabric-apps-notes` 브랜치에 있다.

---

## 1. 한 줄 요약

- **Rayfin SDK**: TypeScript 데코레이터로 데이터 모델을 정의하면 DB 스키마, GraphQL API, 권한 정책, 타입 안전 클라이언트가 만들어진다. [문서]
- **Fabric Apps**: Rayfin으로 만든 앱을 Fabric 안에서 관리형으로 호스팅·인증·권한 관리하는 플랫폼(미리 보기). [문서]
- ETL 도구가 아니라 업무용 웹앱(입력·승인·조회)을 빠르게 만드는 도구다.

## 2. 앱 생성

### 사전 요건 [문서]
- Fabric 접근 권한이 있는 Microsoft 계정, 워크스페이스의 Contributor 이상. 배포에는 앱 항목의 최소 **Edit** 권한이 필요
- 테넌트 관리자가 Fabric 관리 포털 → Tenant settings → **Fabric apps (preview)** 활성화 (조직 전체 또는 보안 그룹, 반영에 수 분)
- 워크스페이스에 Fabric capacity, Node.js 20 이상
- Functions를 쓰면 Azure Functions Core Tools v4

### 방법 A: CLI (가장 빠름) [문서]
```bash
npm create @microsoft/rayfin@latest my-app
cd my-app
npx rayfin up
npm run dev
```
백엔드는 Fabric에 배포하고 프런트엔드만 로컬에서 돌린다. 확인은 `npx rayfin up status`.

### 방법 B: 포털에서 항목 생성 후 가져오기 [문서]
워크스페이스 → New item → App → 이름 입력 → 포털이 보여주는 명령 실행
```bash
npm create @microsoft/rayfin@latest -- "<appitemname>" --template todoapp --workspace <workspacename>
```

### 방법 C: 코딩 에이전트 [문서]
문서가 제공하는 프롬프트가 https://rayfin.ai/docs/reference/agent-rules.md 를 먼저 읽게 한 뒤 scaffold → `rayfin login` → `rayfin up` → `npm run dev`를 진행시킨다. 배포 전 생성 파일을 직접 검토할 것.

### 기존 프로젝트에 추가 [문서]
`npx rayfin init [directory]` (템플릿 목록: `--list-templates`)

### 실제로 겪은 문제와 해결 [실측]
1. **프로젝트 밖에서 `npx rayfin ...` → 404.** `rayfin`이라는 npm 패키지가 없다(CLI 패키지는 `@microsoft/rayfin-cli`). 프로젝트 밖에서는 `npx -p @microsoft/rayfin-cli rayfin login`. 프로젝트 안에서는 `@microsoft/rayfin-cli`가 devDependency라서 `npx rayfin`이 동작한다.
2. **Windows PC에서 `npm create @microsoft/rayfin@latest`가 "Creating project…" 직후 비정상 종료.** Node 24.14.1에서 종료 코드 `3221226505`(0xC0000409), Node 22.23.4에서 `3221225477`(0xC0000005). `--workspace` 옵션, 임시 폴더 경로(한글 사용자 폴더), 콘솔 호스트(PowerShell/cmd)는 원인이 아니었고, Windows 오류 이벤트 로그에도 기록이 없었다. **원인 미확인.** 같은 명령이 Linux(Node 22)에서는 성공해서 **Linux에서 스캐폴딩 → git에 커밋 → Windows에서 clone**으로 우회했다.
3. **템플릿 `npm install` 크래시** `Cannot read properties of null (reading 'edgesOut')`(Linux·Windows 모두 재현). `--legacy-peer-deps`로 해결되어 저장소에 `.npmrc`(`legacy-peer-deps=true`)를 커밋했다. Windows 첫 설치는 약 5분.
4. **npm 캐시 위치를 바꾸면 안 된다.** 새 캐시에서는 `keytar`의 미리 빌드된 바이너리를 못 찾고 소스 빌드로 넘어가 Visual Studio C++ 툴셋이 없어 실패했다(원래 캐시에서는 통과).
5. **Node 22 MSI를 Node 24 위에 설치하려 하면 "ended prematurely"로 실패**(원인 미확인: 하위 버전 덮어쓰기 차단 또는 권한). **압축(zip) 버전을 풀어 그 터미널의 `PATH` 앞에 붙이는 방식**은 설치 없이 동작했다.
6. **`rayfin up` 이후 `rayfin/rayfin.yml`이 자동으로 바뀐다**: `allowedRedirectUris`에 `http://127.0.0.1:5173`과 배포된 호스팅 origin이 추가되고 `storage`/`functions: enabled: false`가 생긴다. 배포마다 CLI가 다시 채우므로 **커밋하지 않는다.** 다음 `git pull` 전에는 백업 후 `git checkout -- rayfin/rayfin.yml`로 되돌린다. 로컬에서 만든 미추적 `package-lock.json`도 원격에 같은 파일이 생기면 pull을 막으므로 먼저 삭제한다.
7. **포털에서 먼저 만든 항목과 이름(프로젝트 ID)이 같으면 `rayfin up`이 그 항목을 재사용했다.** 미리보기는 "Create or reuse"라고만 해서 어느 쪽인지 알려 주지 않으며, 배포 후 `rayfin up status`의 항목 ID가 포털 항목 ID와 같은지로 확인한다. 설치된 가이드: `--yes`는 용량 자동 할당과 **같은 이름 항목 재사용을 함께 승인**하므로 처음에는 붙이지 않는다. 용량 할당·체험판 시작 질문이 나오면 멈춘다.

### `rayfin up`이 하는 일 [문서]
항목 생성(또는 재사용) → publishable key 조회 → `rayfin.yml` 설정 동기화 → DB 스키마 적용 → 정적 콘텐츠 빌드·업로드 → 배포 정보 기록(`rayfin.yml`, `.env.fabric-*`)

| 명령 | 대상 |
|---|---|
| `npx rayfin up` | 설정, DB, 정적 콘텐츠 전체 |
| `npx rayfin up db apply` | DB 스키마만 |
| `npx rayfin up staticapp deploy` | 프런트엔드만 (`--skip-build` 가능) |
| `npx rayfin up --dry-run` | 변경 없이 미리보기 |
| `npx rayfin up status` / `list` / `switch` | 상태, 배포 목록, 워크스페이스 전환 |

### dev / prod 환경 분리 [문서]
두 워크스페이스에 같은 프로젝트를 배포하고 승격은 **수동**이다 (자동 승격 기능 없음).

1. 포털에서 `my-app-dev`, `my-app-prod` 워크스페이스를 직접 생성 (ID 기록)
2. `npx rayfin login` (`--tenant <id>`, 확인: `npx rayfin login status`)
3. `npm create @microsoft/rayfin@latest my-app --workspace my-app-dev`
4. `npx rayfin up --workspace my-app-dev` → dev에 앱 항목 생성, `rayfin/.env`에 기록, dev가 활성 배포
5. dev에서 반복: `npm run dev` → (스키마만) `up db apply` → (전체) `up`
6. 승격: `npx rayfin up --workspace my-app-prod` → prod에 **별도 앱 항목** 생성, 두 번째 배포 기록, `rayfin/.env`가 prod를 가리킴
7. 전환: `npx rayfin up list`, `npx rayfin up switch --list`, `npx rayfin up switch my-app-dev|my-app-prod` (이후 `rayfin up`은 활성 워크스페이스 대상)
8. prod 검증: `npx rayfin up status` + 호스팅 URL 확인. 문제 시 dev로 switch → 수정·검증 → prod로 switch 후 `rayfin up`

권장: 소스는 버전 관리(`rayfin/.env`는 활성 배포를 가리키는 로컬 포인터일 뿐 진실의 원천이 아님), 기능 브랜치에서 작업하고 dev 검증 후 병합, prod에 `--force`를 습관적으로 쓰지 않음, **prod 배포 전 `--dry-run`**, 승격 전 `rayfin.yml`의 인증 설정 확인.

원문 오타: 개요에 `up -workspace`, `up switch -workspace`(하이픈 1개)로 적힌 곳이 있으나 CLI 레퍼런스는 `--workspace`, `switch`는 위치 인자(`up switch my-app-prod`)다. 본문 7단계를 따를 것.

설계 영향 [추정]:
- dev와 prod는 **별개 앱 항목·별개 DB**다. prod에 데이터가 쌓인 뒤 `db apply`의 파괴적 변경 경고는 실제 데이터 손실로 이어진다.
- 워크스페이스마다 앱 ID(항목 소유자)가 다를 수 있어, 외부 리소스·커넥터 소스 권한을 환경별로 따로 부여해야 한다.
- 커넥터의 `workspaceId`/`itemId`가 `rayfin.yml`에 들어가므로 환경별 소스 분리 방법이 필요하다 (`${VAR}` 보간 적용 여부는 미확인).
- 환경마다 호스팅 origin이 다르다. 같은 `rayfin.yml`을 쓰면 `allowedRedirectUris`에 상대 환경의 origin이 남을 수 있으므로 prod 배포 전에 목록을 점검한다 (7절 참조).

## 3. 프로젝트 구조

[실측] `npm create … --template blankapp`(= Universal App) 결과. 템플릿마다 경로가 다르므로 **`rayfin.yml`에 설정된 서비스 경로를 따르고 폴더를 중복 생성하지 않는다.**

```text
.
├── AGENTS.md, .mcp.json, .agents/skills/…   # 코딩 에이전트용 지침·스킬(템플릿에 포함)
├── package.json            # npm 워크스페이스 루트: dev, build, build:fabric, typecheck, lint, test, pack:add
├── package-lock.json       # 커밋함 (win32 선택 의존성 포함)
├── .npmrc                  # legacy-peer-deps=true
├── rayfin/rayfin.yml       # 서비스 설정 (배포 후 CLI가 값을 덧붙임: 커밋하지 않음)
├── rayfin/.project.json    # 익명 텔레메트리 상관용 ID, 커밋 대상
├── rayfin/.lockfile.json   # 에이전트 파일 해시
├── scripts/                # scaffold.mjs(pack:add) 등
└── packages/
    ├── frontend/           # React + Vite + Tailwind v4 (@rayfin-app/frontend)
    ├── data/               # 데코레이터 엔티티와 schema 배열 (@rayfin-app/data)
    └── shared/             # 브라우저에서도 쓰는 계약·상수 (@rayfin-app/shared)
```
(Flat 템플릿은 엔티티가 `rayfin/data/`, Functions가 `rayfin/functions`, 프런트엔드가 `src/`.)

### 템플릿 규칙 [문서: 설치된 AGENTS.md와 스킬]
- 새 기능은 **pack을 한 번에 하나씩** 적용: `npm run pack:add -- data-modeling | connectors | analytics | visuals | functions`. 기존에 수정한 파일은 보존된다(`--force-seeds`는 덮어쓰기).
- 엔티티는 `packages/data/src/`에 쓰고 `index.ts`의 `schema` 배열에 등록하며, 같은 모양의 계약을 `packages/shared/src/index.ts`(`UniversalAppSchema`)에도 추가한다. **프런트엔드는 데코레이터가 붙은 클래스를 import하지 않고** shared 계약만 쓴다.
- 서비스 호출은 `await getRayfinClient()`(`src/lib/rayfin-client.ts`). 인증 게이트(`AuthGate`)와 `assetAccess: protected`는 유지, 비밀번호 인증은 끈 채로 둔다.
- `module memory`, `localStorage`를 데이터베이스로 쓰지 않는다. 쿼리 컬럼을 추측하지 않는다.
- **타입 검사는 `tsc -b`(`npm run typecheck`).** 프런트엔드 `build`는 `tsc -b --noCheck`라서 타입 안전을 보장하지 않는다. 검증 순서: typecheck → build → lint → test.
- 스타일은 `global.css`의 토큰(`bg-primary`, `text-300`, `p-400`, `icon-size-200`)만 사용. `cn()`(tailwind-merge) 안에서 글자 크기와 글자 색을 함께 쓰면 하나가 지워지므로 크기는 `text-[length:var(--text-300)]`로 쓴다. [실측: 실제로 겪음]
- `npm run dev`는 `rayfin dev`(스키마 적용, 로컬 Functions 호스트, Vite)이며 로그인이 필요하다.

### `rayfin.yml` (템플릿 + data-modeling 팩 적용 후) [실측]
```yaml
id: request-app
name: request-app
version: 1.0.0
services:
  auth:
    enabled: true            # false이면 rayfin up 실패
    fabric:
      enabled: true          # 배포 앱에 필수
      externalEntraExchange: true
    password:
      enabled: false         # 로컬 개발 전용, 템플릿은 꺼 둠
    allowedRedirectUris:
      - http://localhost:5173
  data:
    enabled: true
    path: packages/data
    buildCommand: npm run build
    dialect: "mssql"
  staticHosting:
    enabled: true
    path: packages/frontend
    folder: dist
    buildCommand: npm run build:fabric
    indexDocument: index.html
    assetAccess: protected
    embedded:
      only: false
  functions:                 # 쓸 때만 (pack:add -- functions)
    enabled: true
    path: packages/functions
    auth:
      type: application
    buildCommand: npm run build
```

## 4. 데이터 모델

### 타입과 수식어 [문서]
| 데코레이터 | TS 타입 | 비고 |
|---|---|---|
| `@uuid()` | string | `id`는 선언하지 않아도 자동 추가, 복합키·커스텀 키 이름 불가 |
| `@text({ max })` | string | **`max` 필수에 가깝다** (아래) |
| `@int()` `@decimal()` | number | |
| `@boolean()` | boolean | **`@bool()`이 아니라 `@boolean()`** |
| `@date()` | Date | |
| `@email()` | string | 이메일 검증 |
| `@set('a','b')` | 문자열 리터럴 유니온 | 열거형 |

수식어: `optional`, `unique`, `default`(예: `@text({ default: 'pending' })`), `min`/`max`(문자열은 길이, 숫자는 값). 필드는 기본 필수이며 TS의 `?`만으로는 nullable이 되지 않는다. 필수 `@text`는 비어 있으면 빈 문자열, `optional` `@text`는 `null`을 돌려준다.

> **`@text()`에 `max`를 생략하면** SQL Server에서 `NVARCHAR(MAX)`가 되어 GraphQL 스키마 생성이 막히고 **배포가 성공으로 끝난 뒤 런타임에 "Internal server error"** 가 난다. [문서, 설치된 가이드 3곳]

### 엔티티 이름 [문서: 설치된 decorators.md]
엔티티 이름은 GraphQL 타입 이름이 된다. `Date`, `Query`, `Mutation`, `UUID` 등 예약어(와 `__` 시작)는 거부된다. 충돌하면 클래스 이름을 바꾸거나 `@entity('DateRecord')`로 이름을 지정한다.

### 관계 [문서]
- 1:N은 부모 `@many(() => Child)`, 자식 `@one(() => Parent)`. **대상 클래스는 `import type`이 아니라 값으로 import**해야 한다(타입 import는 컴파일에서 지워져 `undefined`가 된다). 순환 참조는 `() =>` 지연 함수 덕분에 안전하다.
- 외래키 `{property}_id`는 자동 생성되며 코드에서 읽거나 쓸 때만 명시 선언(`@text({ max: 36 })`). 외래키 이름 커스터마이징 불가. `@one`/`@many` 옵션은 `optional`, `unique`뿐.
- N:M 미지원 → 조인 엔티티. 시스템 `USER` 엔티티에는 `@one()` 불가 → 사용자 연결은 `@text({ max: 200 }) user_id`에 `session.user.id`(= 정책의 `claims.sub`)를 넣는다. 서버가 자동으로 채워 주지 않는다.
- 클라이언트 쪽 폼 검증용 `toStandardSchema(Entity)`는 ES2022 타겟이 필요하고 `@vitejs/plugin-react-swc`에서는 데코레이터가 지원되지 않는다. 이 템플릿은 swc를 쓰고 프런트엔드가 엔티티 클래스를 import하지 않으므로 **쓰지 않았다**. [문서]

### 이 프로젝트의 모델 [실측: 배포됨]
`packages/data/src/DataRequest.ts`, `RequestComment.ts`
- `DataRequest`: `title`(1~100), `symptom`(선택, 2000), `targetTable`(200), `urgency`(`'low'|'normal'|'urgent'`), `status`(`'received'|'analyzing'|'done'`), `user_id`(200), `requesterEmail`(254), `createdAt`, `comments`(`@many`)
- `RequestComment`: `body`(1~2000), `user_id`, `authorEmail`, `createdAt`, `request_owner_id`(부모 요청의 `user_id` 복사), `request`(`@one`)
- `@set` 값은 영문 코드로 저장하고 한글 표시는 프런트엔드가 한다. [추정: GraphQL 열거형 이름 제약 때문에 피했으며, 한글 값이 실제로 실패하는지는 시험하지 않았다]
- 상태 변경 이력은 별도 엔티티 없이 코멘트 본문 접두어 `[상태 변경]`으로 남긴다(스키마 변경 없이 감사 이력 확보).

### 스키마 반영 워크플로 [문서]
엔티티 클래스를 수정해도 배포된 DB는 바뀌지 않는다.
```bash
npx rayfin up          # 1. 적용
npx rayfin up status   # 2. healthy 확인 (성공 메시지만으로는 쿼리 가능을 보장 못함)
npx rayfin up db apply # 3. 변경 엔티티가 계속 오류면 스키마만 재적용
```
- 컬럼 삭제·타입 축소·테이블 이름 변경은 CLI가 막는다. `--force`는 영구 데이터 손실 가능.
- 엔티티·필드 이름은 데이터를 넣기 전에 확정하는 편이 안전하다. [추정]
- 포털에서 SQL DB를 직접 수정하면 다음 `rayfin up`에서 덮어써진다.
- `services.data.enabled: true`에는 `dialect: mssql`이 필요하다(없으면 배포 시 400).
- [실측] 첫 배포(엔티티 2개)에서 `rayfin up`이 SQL database `request-app`을 생성했고, 앱에서 요청 생성·조회·상태 변경이 동작했다.

## 5. 데이터 권한

### 규칙 [문서: 설치된 permissions.md, core/permissions.md]
```typescript
@authenticated(action, { policy?, include?, exclude? })   // 설치 문서가 권장하는 축약형
@role('authenticated', action, options)                    // 동일 효과
```
- **내장 역할은 `authenticated`와 `anonymous` 둘뿐이다.** "커스텀 역할 이름" 사용 가능이라는 Learn 서술은 설치 문서와 다르며, **`'staff'` 같은 역할은 쓸 수 없다.** `anonymous`는 테넌트 관리자 스위치("Enable anonymous data access for Fabric Apps")가 필요하다.
- 액션: `'create' | 'read' | 'update' | 'delete' | '*'`
- 옵션 키는 **`policy`** (생성되는 DAB 설정 안에서만 `check`라는 이름으로 나온다), 필드 단위는 `include`/`exclude`(엔티티 프로퍼티명으로 타입 체크).
- 정책 식 `(claims, item) => claims.sub.eq(item.user_id)`: claim은 `sub` `email` `role`, 비교는 **`eq`/`ne`**(타입 정의 기준), 조합은 `.and()` `.or()`. 배열 포함("in") 같은 조건은 정책에서 못 쓴다.
- 같은 역할의 `@role`을 여러 개 붙일 수 있고 역할별로 합쳐진다(충돌하면 경고). 서버가 매 요청마다 강제한다. **접근 제어 없는 엔티티는 검증 단계에서 거부된다.**
- 정책은 접근을 **검사**할 뿐 소유자 필드를 채우지 않는다. 생성 시 클라이언트가 `owner/user_id = session.user.id`를 넣어야 하고, 정책이 다른 값을 거부한다.
- `claims.role`의 값이 어디서 오는지는 **어떤 문서에도 없다.** 세션 타입에는 `role?: string`이 있으나 출처 불명. `customClaims`는 모든 사용자에게 같은 정적 값.
- 같은 역할(`authenticated`)·같은 액션에는 사용자별로 다른 `include`/`exclude`를 줄 수 없다. 요청자와 담당자를 필드 단위로 구분하는 것은 불가능해서, **액션 자체를 담당자에게만 열어** 막는다.

### 이 프로젝트의 정책 [실측: 컴파일 확인, 배포됨]
담당자는 이메일(`packages/shared/src/staff.ts`의 `STAFF_EMAILS`)로 식별한다.

| 엔티티 | 액션 | 정책 (컴파일된 DAB 식) |
|---|---|---|
| DataRequest | create | `@claims.sub eq @item.user_id` |
| DataRequest | read | `(@claims.email eq '<담당자>') or (@claims.sub eq @item.user_id)` |
| DataRequest | update, delete | `@claims.email eq '<담당자>'` |
| RequestComment | create | `@claims.sub eq @item.user_id` |
| RequestComment | read | `((담당자 email) or (@claims.sub eq @item.request_owner_id)) or (@claims.sub eq @item.user_id)` |
| RequestComment | delete | `(담당자 email) or (@claims.sub eq @item.user_id)` |

- 정책 식은 로컬에서 실제로 컴파일해 위 문자열이 나오는 것을 확인했다(`reduce`로 이메일 여러 개를 `or`로 이어도 동작).
- **담당자 계정 화면에서 요청이 "분석 중"으로 바뀐 것이 확인되었다.** update 정책이 이메일 일치일 때만 허용하므로 서버가 `claims.email`을 인식한 것으로 보인다. [실측, 간접: 변경 과정을 직접 본 것은 아님]
- 한계: ① 담당자 목록을 바꾸면 코드 수정과 재배포가 필요하다. ② 코멘트의 `request_owner_id`는 서버가 진위를 검증하지 못한다(로그인한 사용자가 다른 사람 요청에 코멘트를 붙일 수 있음). ③ `claims.email`의 대소문자 처리는 미확인이라 목록을 소문자로 쓰고 있다.

## 6. 데이터 읽기·쓰기 (GraphQL 클라이언트)

[문서] 접근: `client.data.<Entity>`

| 작업 | 메서드 | 비고 |
|---|---|---|
| 목록 | `.select([...]).execute()` | 한 페이지(기본 100건)만, 더 있어도 알려 주지 않음 |
| 단건 | `.findById(id)` | **기본키만 채워 반환**. 필드가 필요하면 `select().where().first(1)` |
| 필터 | `.where({ f: { eq } })` | 아래 연산자 표 |
| 정렬 | `.orderBy({ f: 'desc' })` | 체이닝, 안정적인 정렬을 위해 `id`를 마지막 키로 |
| 관계 | `select(['comments.id','comments.body'])` | 한 쿼리로 조인 |
| 페이지 | `.first(n).after(cursor).executePaginated()` | `items` `hasNextPage` `endCursor`. 페이지 사이에 select·where·orderBy가 같아야 함 |
| 집계 | `.aggregate({...})` `.groupBy([...])` | **숫자 필드만**, `having`·`distinct` 옵션 |
| 생성/수정/삭제 | `create` / `update(filter, data)` / `delete(filter)` | 삭제는 일치 행이 없어도 성공 |
| 업서트 | `upsert(where, create, update)` | 원자적이지 않음 |

### `where` 연산자 [문서: 설치된 rayfin-data 타입 정의]
| 대상 | 연산자 |
|---|---|
| 문자열 | `eq` `neq` `gt` `gte` `lt` `lte` `contains` `notContains` `startsWith` `endsWith` `isNull` `in` |
| 숫자 | `eq` `neq` `gt` `gte` `lt` `lte` `isNull` `in` |
| 불리언 | `eq` `neq` `isNull` `in` |
| 날짜 | `eq` `neq` `gt` `gte` `lt` `lte` `isNull` `in` (PostgreSQL에서는 날짜 비교 미지원 경고, SQL Server는 해당 없음) |
| 조합 | 같은 객체의 여러 키는 AND, `and: [...]`, `or: [...]` |

### 주의점
- `totalCount`는 채워지지 않고 단독 `count()`도 없다. 건수는 모든 페이지를 읽어 세거나, **숫자 필드를 둔 집계**를 쓴다. 이 프로젝트는 숫자 필드가 없어 상태별 건수를 행을 읽어 센다(최대 5,000건, 넘으면 "+" 표시).
- 한 페이지는 기본 100건, 최대 100,000건(`first(-1)`은 무제한 요청이지만 최대치로 잘림).
- 집계는 `select`/`orderBy`/`first`/`after`와 함께 쓸 수 없다. `where`는 가능. 날짜 단위(월별) 그룹핑은 확인되지 않았다.
- 관계는 `request: { id }` 객체로 지정한다. `create`가 돌려주는 행에 일부 필드만 있을 수 있으므로 **보낸 값과 합쳐서** 화면에 쓴다.
- 세션: `client.auth.getSession()` → `session.user.id`, `session.user.email`, (`role?`). 콜백 이름은 `onSessionChange`(`onAuthStateChange`는 없음).

## 7. 인증

[문서]
- **배포 앱은 Microsoft Entra ID(Fabric SSO)만 지원.** 이메일/비밀번호는 로컬 백엔드 전용. 첫 로그인 시 사용자 자동 생성(별도 가입 없음).
- 로그인: `ensureSignedInWithFabric(client.auth, { workspaceId, projectId, fabricPortalUrl, returnOrigin })` (`@microsoft/rayfin-auth-provider-fabric`). 순서: 기존 세션 → 리프레시 → Fabric iframe 임베드 → 팝업. **팝업 단계는 클릭 등 사용자 동작 핸들러 안에서만** 호출, 5분 안에 완료. 이 템플릿은 `AuthProvider`/`AuthGate`가 이를 이미 처리한다.
- 세션 값은 인증 여부, `user`(`id`, `email`, `role?`), `rayfin.yml`의 커스텀 클레임. 토큰은 불투명하게 취급.
- 환경 변수는 `rayfin/.env`의 `RAYFIN_PUBLIC_*`(ITEM_ID, WORKSPACE_ID, PORTAL_URL 등)가 `VITE_*`로 매핑된다. 이 템플릿은 배포 환경별 값을 **런타임에** 가져온다(`resolveRayfinConfig`).
- `allowedRedirectUris`: `returnOrigin`은 항목과 스킴·호스트·포트까지 정확히 일치해야 한다(bare origin). 이 목록은 보안 경계이므로 와일드카드·제3자 origin 금지, 오래된 origin 정리. 변경 후 `rayfin up`.
- 커스텀 클레임(`services.auth.customClaims`)은 **앱 전체 공통 정적 값**이다. 사용자별 구분용이 아니다.
- 서비스 주체(service principal) 로그인은 도움말에 있으나 **현재 미지원** → CI/CD 자동 배포 제약. 로그인 자격은 OS 키체인(`keytar`)에 저장되고 `rayfin login status`에 만료 시각이 표시된다(약 1시간 후 갱신/재로그인).

### 실측 결과
- **Fabric 포털 안에서 앱을 여는 임베드 방식**: 팝업 없이 정상 로그인.
- **독립 URL(`https://<이름>-<리전>.webapp.fabricapps.net`) 팝업 방식**: **Chrome에서 정상.** Edge에서는 "Sign in to continue" 화면에 **"문제가 발생함"** 이 떴다. 원인은 확인하지 못했고(콘솔 오류 미수집), Chrome에서는 재현되지 않았다. [미확인]
- 배포 후 CLI가 `allowedRedirectUris`에 추가한 것은 **경로 없는 origin 두 개**(`http://127.0.0.1:5173`, 호스팅 origin)뿐이었다. 호스팅 문서가 말한 `/auth/callback` 항목은 **추가되지 않았다.** (Fabric SSO 팝업은 콜백 페이지가 없는 `postMessage` 방식)
- 담당자 계정으로 로그인하면 세션의 `user.email`이 화면에 표시되었고, 서버 정책은 `claims.email`을 사용했다(5절).

## 8. 정적 호스팅

[문서]
- `assetAccess`: `protected`(로그인 + 앱 보기 권한 필요, 비대화형 배포 기본값) / `public`(URL을 아는 누구나). 변경은 **전체 `rayfin up`** 필요(`staticapp deploy`는 반영 안 함). 정적 파일 접근만 통제하며 API 권한을 대체하지 않는다.
- `folder`는 필수, `root`/`path`로 하위 프런트엔드 폴더 지정. 압축 ZIP 100MB 이하. 소스맵 제외, 이미지 압축, 바이너리는 Fabric Apps 스토리지로.
- 로컬 확인: `npm run build` → 정적 서버로 열기. 이 템플릿의 호스팅 빌드는 `npm run build:fabric`.

[실측]
- 호스팅 URL 형식: `https://<이름>-<리전>.webapp.fabricapps.net`. 포털 항목 화면의 "라이브 URL"과 `rayfin up status`의 `Static app:`이 같은 값이다.
- `protected`일 때 로그아웃 상태로 열면 앱 코드가 아니라 호스팅 계층의 **"Sign in to continue / This app is private"** 화면이 먼저 나온다.
- 호스팅 문서의 `/auth/callback` 자동 등록 서술은 이 팝업 로그인 흐름에서는 해당하지 않았다(7절).

## 9. Functions (서버 측 로직)

[문서] (CLI 미리 보기 버전)
- TypeScript 함수가 앱 안에서 서버 실행되고 HTTP 엔드포인트로 노출. 프런트엔드는 타입이 지정된 클라이언트로 호출.
- 추가: `npx rayfin functions init`, 로컬: `npm run dev` / `npx rayfin dev functions apply`, 배포: `npx rayfin up`
- `services.functions.auth.type: application` 필수
- 코드 패턴:
```typescript
import { UserDataFunctions, AudienceType, type RayfinContext } from '@microsoft/fabric-user-data-functions';
const udf = new UserDataFunctions();
udf.func('name', async (ctx: RayfinContext<AppSchema, AudienceType.Storage>) => {
  const token = ctx.Tokens.Storage;   // 서버에서만 사용, 반환 금지
  return 'ok';
}, []);                                // 세 번째 인자는 []
```
- 오디언스: `Sql`(lakehouse/warehouse/SQL DB 등), `Storage`, `Fabric`(REST API), `AzureAI`(Foundry), `ADO`. **시맨틱 모델은 `ctx.Tokens`로 접근 불가** → 시맨틱 모델 커넥터 사용.
- `RayfinContext<...>` 타입 주석이 선언이자 필수 조건. 타입 별칭 대신 리터럴 `AudienceType.X` 권장. `types.ts`는 생성 파일이므로 수정 금지.

권한 모델:
| 경로 | 신원 |
|---|---|
| 외부 리소스 (`ctx.Tokens.*`) | **앱 ID = 앱 항목 소유자** (호출 사용자 아님) |
| Rayfin DB (`ctx.getDataClient()`) | **호출 사용자** (행 수준 보안 유지) |

- 외부 리소스 권한은 앱 ID에 직접 부여해야 한다. 오디언스 선언·배포만으로 권한이 생기지 않는다.
- 로컬 실행은 개발자 계정 권한으로 토큰을 받으므로 **로컬 성공 ≠ 배포 후 권한 보장**. 배포된 함수를 다시 테스트할 것.
- 제약: 함수 소유자만 코드 수정·게시, 게시 간격 2분, ZIP 30MB, 실행 240초, 로그 30일. 페이로드 4MB는 원문도 미검증.
- 함수로 DB 접근해도 호출자 권한이 유지되므로 "담당자 전체 조회"를 함수로 우회할 수 없다.

## 10. 커넥터 (다른 Fabric 항목 연결)

[문서]
| 항목 | 타입 | 작업 |
|---|---|---|
| Lakehouse SQL endpoint | `fabric-sqlanalytics` | read |
| Warehouse | `fabric-warehouse` | read, create, update, delete |
| SQL database in Fabric | `fabric-sqldatabase` | read, create, update, delete |
| 시맨틱 모델 | `fabric-semanticmodel` | executeQuery (DAX) |

```bash
npx rayfin connector search "sales" --workspace-id <id> --type fabric-warehouse --json
npx rayfin connector add --type fabric-warehouse --workspace-id <id> --item-id <id> --name inventory --operations read
```
`connector add`가 출력하는 `npm install` 명령을 그대로 실행한다.

- **SQL 계열은 앱 DB와 같은 유창한 API로 조회**한다 (`client.connectors.<name>.<Entity>.select([...]).first(20).execute()`). DAX는 시맨틱 모델 전용. (앞선 요약본의 "GraphQL 언급 없음"은 오류)
- 인증 모드: SQL 계열 기본 `application`(앱 ID로 접근, CLI 1.36.2), `delegated`는 `rayfin.yml`에 `auth.type: delegated`를 직접 지정. 시맨틱 모델은 **delegated 전용**이며 호출자에게 Build 등 모델 권한 필요. `auth.type`은 항상 명시.
- 커넥터 엔티티에도 `@role`로 사용자별 권한·행 정책·필드 제한을 건다. application 모드에서는 소스 권한이 호출자별로 검사된다고 가정하지 말고 `@role`로 통제한다.
- 키 없는 테이블은 `primaryKey`를 생략한다(컬럼 이름으로 추정 금지). 스키마 탐색 경고는 엔티티 정의 전에 해결.
- 클라이언트: `ConnectorsRayfinClient` (시맨틱 모델은 `fabricSemanticModel()` 런타임 필요). 클라이언트 생성이 로그인을 대신하지 않는다.
```typescript
const r = await client.connectors.salesModel.executeQuery({ query: 'EVALUATE TOPN(10, Sales)' });
if (r.status === 'success') { /* r.table.columns / rows */ } else { /* r.error.category / message */ }
```

### 시맨틱 모델 앱 템플릿 (`--template dataapp`) [문서]
Node 20+, Contributor/Member/Admin, 테넌트 설정(Fabric Apps + Semantic Model Execute Queries REST API), 모델 Build·Read 권한. 별도 토큰·인증 흐름 추가 금지, Execute Queries REST API 직접 호출 금지, 실패 시 목업 데이터 대체 금지. 시각화 컴포넌트, 데이터 그리드, Playwright 검증 워크플로 포함.

## 11. 제약과 보안

[문서]
- 복잡한 다단계 트랜잭션·저장 프로시저가 필요한 앱, Fabric SSO 외 인증이 필요한 앱은 부적합. 미리 보기이며 리전 제한.
- 시크릿·API 키를 코드·프런트엔드·저장소에 넣지 않는다. 기여자 최소 권한. 수집 데이터의 법적·규정 준수는 사용자 책임.
- 권한: Run and interact(기본, 워크스페이스 멤버) / Edit(배포, 스키마·설정 변경) / Reshare(워크스페이스 admin 필요).

## 12. 활용 방향

### 12-1. 자동 리포트 생성기가 아니다 [문서 기반 해석]
템플릿 + 코딩 에이전트로 개발자가 분석용 웹앱을 만든다. 스케줄 발송, PDF/Excel 내보내기, 자동 인사이트 문구는 확인되지 않았다.

### 12-2. 자연어 질의 → 대시보드 [추정]
기본 기능이 아니라 직접 설계해야 한다. 현재 문서로 설명되는 가장 안전한 분리 구성:
1. 프런트엔드 질문 입력
2. **Functions**(`AzureAI` 오디언스)에서 LLM이 시맨틱 모델 메타데이터를 참고해 DAX + 시각화 매핑(구조화 출력) 생성 — 시크릿은 서버에만
3. 프런트엔드가 **시맨틱 모델 커넥터(delegated)** 로 `executeQuery` 실행 (호출자 권한 적용)
4. 템플릿의 검증된 컴포넌트로 렌더링 (LLM이 화면 코드를 짜지 않게 한다)

리스크: Functions에서 커넥터를 호출할 수 있는지 불명, 앱 ID(항목 소유자) 권한 의존, DAX 환각, 결과 크기 제한.

### 12-3. 요청 관리 앱 — 구현 현황 [실측]
현업이 요청(대상 테이블, 증상, 긴급도)을 등록하고, 담당자가 상태를 바꾸고 코멘트로 소통하며, 요청자는 본인 건만 본다. 저장소 `app/skeleton` 브랜치, 배포 워크스페이스 `Fabric_testbox`.

| 영역 | 기능 |
|---|---|
| 요청자 | 요청 등록, 본인 요청 목록·상세, 코멘트 |
| 담당자 | 전체 요청 조회, 처리 상태 변경(접수/분석 중/처리 완료), 요청 삭제(확인창에 제목 표시), 상태 변경 이력 자동 기록 |
| 조회 | 현황 카드 5개(클릭하면 필터), 서버 검색(제목·대상 테이블·요청자), 긴급도·기간(오늘/7일/30일/이번 달)·"내가 등록한 것만" 필터, 25건씩 "더 보기" |
| 내보내기 | CSV(UTF-8 BOM, 수식 주입 방어, 최대 5,000건, 영문 파일명), 월말 집계용 |
| 편의 | 요청별 링크(`#request=<id>`) 복사·직접 열기, 새로고침과 갱신 시각, Ctrl+Enter 코멘트 등록, 다크 모드, 모바일(목록/상세 교대) |
| 안전 | 오류는 일반 문구만 표시(내부 정보는 콘솔), 입력 길이는 엔티티 `max`와 동일, 값은 렌더 전에 정규화 |

파일 지도:
```text
packages/shared/src/        index.ts(계약·상수·상태 코드), staff.ts(담당자 이메일 목록)
packages/data/src/          DataRequest.ts, RequestComment.ts, index.ts(schema 배열)
packages/frontend/src/
  App.tsx                   필터·선택·내보내기 상태를 가진 Tracker
  components/               RequestList, RequestForm, RequestDetail, SummaryStrip, FilterBar, StatusBadge, states
  hooks/                    use-requests, use-request-detail, use-summary, use-current-user, use-debounced, use-hash-selection
  lib/                      query(필터→where), request-queries(페이지 읽기), summary, csv, export-requests, labels, errors
```
검증: typecheck·build·lint 통과, 테스트 76개 통과, 서버 호출을 가짜로 바꾼 임시 환경에서 브라우저로 시험(검색·필터·카드·CSV 내용·딥링크·요청자 화면·모바일·다크·오류). **실제 서버에서 확인된 것**은 요청 생성·목록·상태 변경·포털 임베드 로그인·Chrome 독립 URL 로그인이고, 검색(`contains`)·기간(`gte`)·`or`·CSV·현황 집계는 **가짜 환경에서만 확인**했다.

### 12-4. 다음 후보
| 기능 | 필요한 변경 |
|---|---|
| 담당자 지정과 "내 담당 요청" 필터 | 요청에 `assignee` 필드 추가(스키마 변경) |
| 처리 기한/SLA, 기한 초과 표시 | 기한 필드 추가 |
| 분류(데이터 오류·신규 요청·권한 등)와 분류별 집계 | 분류 필드 |
| 요청자의 본인 요청 수정(접수 상태일 때만) | update 정책 변경(요청자 허용 + 상태 필드 보호 방법 필요) |
| 정확한 건수 집계 | 숫자 필드(예: 값이 1인 `int`)를 추가해 `aggregate` 사용(요청이 수천 건을 넘을 때) |
| 알림(새 요청이 오면 Teams/이메일) | Functions + 외부 연결, 앱 ID(항목 소유자)에 권한 부여 |

쓰지 않는 게 나은 경우: 단순 조회 리포트(Power BI가 간단), 복잡한 트랜잭션, 대규모 데이터 가공.

## 13. 확인 현황

### 해소된 항목
| 항목 | 결과 |
|---|---|
| `@bool` vs `@boolean` | `@boolean()` |
| `@role` 여러 개 | 가능, 같은 역할끼리 합쳐짐 |
| 옵션 키 `policy` vs `check` | **`policy`** (`check`는 생성되는 설정 안의 이름) |
| 커스텀 역할(`'staff'`) | **불가**. 내장 역할 2개뿐 (설치된 문서) |
| `@role`이 없는 엔티티 | 검증 단계에서 **거부됨** |
| 정책 연산자 | `eq`/`ne` + `and`/`or`. 조회 `where`는 `contains`·`in`·날짜 비교까지 지원 |
| 사용자 ID 얻기 | `client.auth.getSession().user.id` / `.email` |
| 서버 측 로직 | Functions 지원 |
| `assetAccess` | `protected`/`public` |
| `/auth/callback` 등록 | **등록되지 않음**. 경로 없는 origin만 추가 [실측] |
| `claims.email` 사용 | 서버가 인식하는 것으로 보임(담당자 상태 변경 성공) [실측, 간접] |
| 한 앱에서 포털 항목 먼저 생성 후 CLI 배포 | 같은 이름이면 기존 항목 재사용 [실측] |

### 남은 미확인
| 항목 | 상태 |
|---|---|
| **요청자 계정으로 본인 건만 보이는지, 상태 변경이 서버에서 막히는지, 그때 오류 형태** | 두 번째 계정이 없어 미시험. 권한 정책의 핵심 검증 |
| `claims.email`의 대소문자 처리 | 목록을 소문자로 쓰는 중, 미확인 |
| `claims.role`의 값 출처, 사용자별 역할 부여 방법 | 어떤 문서에도 없음 |
| 코멘트가 있는 요청을 삭제할 때(외래키) | 미시험 |
| 외래키 컬럼의 실제 이름(`request_id` 예상) | 포털 SQL database에서 확인 필요 |
| 실제 서버에서 검색·기간 필터·`or`·CSV·현황 집계 | 가짜 환경에서만 확인 |
| Edge에서 독립 URL 로그인 실패 원인 | 콘솔·네트워크 오류 미수집 |
| Windows에서 `npm create`(스캐폴더) 비정상 종료 원인 | 미확인, Linux 스캐폴딩으로 우회 |
| 시맨틱 모델 RLS가 delegated 실행에 적용되는지 | 미확인 |
| Functions 안에서 시맨틱 모델 커넥터 호출 가능 여부 | 미확인 |
| 앱 DB와 커넥터 한 앱 혼용 | 미확인 |
| 날짜 단위(월별) 그룹핑 | 미확인 |
| `@set` 필수 필드의 `default` | 미확인 |
| 환경별(dev/prod) 커넥터 소스 지정(`${VAR}` 보간 적용 여부), 환경별 앱 ID 권한 분리 | 미확인 |
| 가격·라이선스 | 용량 할당이 필요하다는 것 외에 없음 |
| 아직 안 읽은 문서 | `anonymous-data-access`, `troubleshooting`, `create-app-with-cli`, `create-app-with-github-copilot` |

## 14. 다음 할 일

- [x] 사전 요건 확인(테넌트 설정, capacity 워크스페이스, Node 20+)
- [x] 개발 워크스페이스에서 PoC: 요청 관리 앱 생성·배포, 포털에서 앱 열기
- [x] 로그인 후 세션 확인(`user.id`, `user.email`), 담당자 상태 변경 동작 확인
- [ ] 이번 변경(검색·필터·현황·CSV·이력)을 `git pull` → `npm install` → `rayfin up --dry-run` → `rayfin up`으로 배포하고 실제 서버에서 확인
- [ ] **두 번째(요청자) 계정으로 권한 시험**: 본인 건만 조회, 남의 요청 접근, 상태 변경 시도 시 서버 동작
- [ ] 코멘트가 있는 요청 삭제, 외래키 컬럼 이름, 대소문자 이메일 확인
- [ ] Edge 독립 URL 로그인 실패 원인(콘솔·네트워크 오류) 수집
- [ ] 다음 기능 선택(12-4)
- [ ] prod 워크스페이스 분리 시: `allowedRedirectUris`에서 dev 전용 origin 정리, `--dry-run` 후 승격
- [ ] (선택) 자연어 → DAX → 시각화 PoC 설계 및 Fabric 기존 AI 기능과 비교

## 15. 출처

### Microsoft Learn (2026-11-09 확인)
- https://learn.microsoft.com/en-us/fabric/apps/overview
- https://learn.microsoft.com/en-us/javascript/api/fabric-apps-sdk-javascript/rayfin-overview?view=fabric-apps-sdk-javascript-latest
- https://learn.microsoft.com/en-us/fabric/apps/project-structure
- https://learn.microsoft.com/en-us/fabric/apps/data-apps-template
- https://learn.microsoft.com/en-us/fabric/apps/create-app
- https://learn.microsoft.com/en-us/fabric/apps/deploy-app
- https://learn.microsoft.com/en-us/fabric/apps/cli-reference
- https://learn.microsoft.com/en-us/fabric/apps/data-models
- https://learn.microsoft.com/en-us/fabric/apps/data-permissions
- https://learn.microsoft.com/en-us/fabric/apps/read-write-data-graphql
- https://learn.microsoft.com/en-us/fabric/apps/authentication
- https://learn.microsoft.com/en-us/fabric/apps/fabric-authentication
- https://learn.microsoft.com/en-us/fabric/apps/configure-authentication-redirect-uris
- https://learn.microsoft.com/en-us/fabric/apps/dev-prod-workflow
- https://learn.microsoft.com/en-us/fabric/apps/functions
- https://learn.microsoft.com/en-us/fabric/apps/functions-connect-external-resources
- https://learn.microsoft.com/en-us/fabric/apps/apply-schema-changes
- https://learn.microsoft.com/en-us/fabric/apps/connectors
- https://learn.microsoft.com/en-us/fabric/apps/hosting

### 설치된 패키지 문서와 프로젝트 지침 (1.36.2, 2026-11-13 확인)
- `node_modules/@microsoft/rayfin-guide/assets/docs/`: `data/permissions.md`, `data/graphql.md`, `data/overview.md`, `data/validation.md`, `known-limitations.md`, `auth/fabric.md`, `app-backend/deploy.md`
- `node_modules/@microsoft/rayfin-core/assets/docs/`: `decorators.md`, `permissions.md`
- `node_modules/@microsoft/rayfin-data/assets/docs/`: `index.md`, `aggregations.md`, 타입 정의 `dist/graphql/types.d.ts`
- `node_modules/@microsoft/rayfin-auth/dist/types.d.ts` (`OpaqueSession`, `User`)
- 프로젝트 `AGENTS.md`와 `.agents/skills/{data-modeling,crud-ui,app-design,app-deployment}/SKILL.md`
