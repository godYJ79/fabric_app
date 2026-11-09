# Fabric Apps (Preview) / Rayfin SDK 정리 (정정본)

작성일: 2026-11-09
목적: Microsoft Learn 원문 확인 결과를 정리한 인수인계 문서. 앞선 요약본의 오류를 바로잡고 미확인 항목을 줄였다.
표기: **[문서]** 원문에서 확인 / **[추정]** 원문에 없는 해석·아이디어 / **[미확인]** 아직 확인되지 않음
주의: 명령어·설정 키는 CLI 버전(문서 기준 1.36.2)에 따라 다를 수 있다. 실행 전 `npx rayfin <command> --help`로 확인할 것. 아래 코드는 모두 **미실행**이다.

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

### `rayfin up`이 하는 일 [문서]
항목 생성(또는 재사용) → publishable key 조회 → `rayfin.yml` 설정 동기화 → DB 스키마 적용 → 정적 콘텐츠 빌드·업로드 → 배포 정보 기록(`rayfin.yml`, `.env.fabric-*`)

| 명령 | 대상 |
|---|---|
| `npx rayfin up` | 설정, DB, 정적 콘텐츠 전체 |
| `npx rayfin up db apply` | DB 스키마만 |
| `npx rayfin up staticapp deploy` | 프런트엔드만 (`--skip-build` 가능) |
| `npx rayfin up --dry-run` | 변경 없이 미리보기 |
| `npx rayfin up status` / `list` / `switch` | 상태, 배포 목록, 워크스페이스 전환 |

## 3. 프로젝트 구조

[문서] 템플릿에 따라 경로가 다르다. **`rayfin.yml`에 설정된 서비스 경로를 따르고 폴더를 중복 생성하지 않는다.**

| 항목 | Universal App (`blankapp`) | Flat 템플릿 |
|---|---|---|
| 엔티티 | `packages/data/src/` | `rayfin/data/` |
| 등록 | `packages/data/src/index.ts`의 `export const schema = [...]` | `rayfin/data/schema.ts` 타입 맵 |
| 클라이언트 계약 | `packages/shared/src/index.ts` (`UniversalAppSchema`) | 해당 없음 |
| Functions | `packages/functions` | `rayfin/functions` |
| 프런트엔드 | `packages/frontend/src/` | `src/` |

- `blankapp`은 Data가 기본 꺼짐. `npm run pack:add -- data-modeling`으로 켠다.
- Data를 수동 설정할 때는 `services.data`에 `enabled: true`, `dialect: mssql`.
- `rayfin/.temp/`와 `rayfin/.env`는 커밋하지 않는다.

### `rayfin.yml` 예시 [문서]
```yaml
id: my-app
name: my-app
version: 1.0.0
services:
  auth:
    enabled: true            # false이면 rayfin up 실패
    allowedRedirectUris:
      - http://localhost:5173
    fabric:
      enabled: true          # 배포 앱에 필수
    password:
      enabled: true          # 로컬 개발 전용
  data:
    enabled: true
    dialect: mssql
  staticHosting:
    enabled: true
    folder: dist
    buildCommand: npm run build
    indexDocument: index.html
    assetAccess: protected
  functions:                 # 사용할 때만
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
| `@set('a','b')` | 문자열 리터럴 유니온 | 상태값 등 열거형 |

수식어: `optional`, `unique`, `default`, `min`/`max` (문자열은 길이, 숫자는 값). 필드는 기본 필수이며 TS의 `?`만으로는 nullable이 되지 않는다. `{ optional: true }`를 쓴다.

> **`@text()`에 `max`를 생략하면** SQL Server에서 `NVARCHAR(MAX)`가 되어 GraphQL 메타데이터 생성이 막히고 배포 후 Data API가 500 오류를 낸다. [문서]

### 관계 [문서]
- 1:N은 부모 `@many(() => Child)`, 자식 `@one(() => Parent)`. 외래키 `{property}_id`는 자동 생성되며 코드에서 읽거나 쓸 때만 명시 선언(`@text({ max: 36 })`).
- N:M 미지원 → 조인 엔티티. 외래키 이름 커스터마이징 불가.
- 시스템 `USER` 엔티티에는 `@one()` 불가. 사용자 연결은 `@text({ max: 255 }) user_id` 필드에 `claims.sub` 값을 넣는다.

### 요청 관리 앱 모델 예시 [추정, 미실행]
```typescript
import { entity, uuid, text, set, date, one, many } from '@microsoft/rayfin-core';

@entity()
export class DataRequest {
  @uuid() id!: string;
  @text({ min: 1, max: 100 }) title!: string;
  @text({ optional: true, max: 2000 }) symptom?: string;
  @text({ max: 255 }) user_id!: string;
  @set('접수', '분석중', '처리완료') status!: '접수' | '분석중' | '처리완료';
  @date() createdAt!: Date;
  @many(() => RequestComment) comments?: RequestComment[];
}

@entity()
export class RequestComment {
  @uuid() id!: string;
  @text({ max: 2000 }) body!: string;
  @text({ max: 255 }) user_id!: string;
  @date() createdAt!: Date;
  @text({ max: 36 }) datarequest_id!: string;   // 프로퍼티명 기반. 배포 후 실제 컬럼명 확인
  @one(() => DataRequest) datarequest?: DataRequest;
}
```

### 스키마 반영 워크플로 [문서]
엔티티 클래스를 수정해도 배포된 DB는 바뀌지 않는다.
```bash
npx rayfin up          # 1. 적용
npx rayfin up status   # 2. healthy 확인 (성공 메시지만으로는 쿼리 가능을 보장 못함)
npx rayfin up db apply # 3. 변경 엔티티가 계속 오류면 스키마만 재적용
```
- 컬럼 삭제·타입 축소·테이블 이름 변경은 CLI가 막는다. `--force`는 영구 데이터 손실 가능.
- 엔티티·필드 이름은 데이터를 넣기 전에 확정하는 편이 안전하다. [추정, 필드 이름 변경이 같은 취급인지는 원문에 없음]
- 포털에서 SQL DB를 직접 수정하면 다음 `rayfin up`에서 덮어써진다.

## 5. 데이터 권한 (`@role`)

[문서]
```typescript
@role(roleName, actions, options?)
```
- 기본 역할: `authenticated`, `anonymous`. 커스텀 역할 이름도 정책에서 사용 가능.
- 액션: `'create' | 'read' | 'update' | 'delete' | '*'` (배열 가능)
- 옵션: `policy`(행 단위), `include`/`exclude`(필드 단위, 엔티티 프로퍼티명으로 타입 체크됨)
- 정책 식: `(claims, item) => claims.sub.eq(item.user_id)`. claim은 `sub` `email` `role`. 연산자는 `.eq()`뿐이고 `.and()` `.or()`로 조합.
- **한 클래스에 `@role`을 여러 개 붙일 수 있다.** 같은 역할 이름은 합쳐지고 충돌하면 경고.
- 서버가 매 API 요청마다 강제한다. 클라이언트 타입은 권한 경계가 아니다.

### 적용 예 [추정, 미실행]
```typescript
@entity()
@role('authenticated', 'create', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
  include: ['title', 'symptom', 'user_id'],
})
@role('authenticated', ['read', 'update'], {
  policy: (claims, item) => claims.role.eq('staff').or(claims.sub.eq(item.user_id)),
})
@role('authenticated', 'delete', {
  policy: (claims, _item) => claims.role.eq('staff'),
})
export class DataRequest { /* ... */ }
```
`'staff'`는 임의 예시. `claims.role`이 실제로 채워지는지는 아래 미확인 참조.

## 6. 데이터 읽기·쓰기 (GraphQL 클라이언트)

[문서] 접근: `client.data.<Entity>`

| 작업 | 메서드 | 비고 |
|---|---|---|
| 목록 | `.select([...]).execute()` | 한 페이지(기본 100건)만 |
| 단건 | `.findById(id)` | **기본키만 채워 반환**. 필드가 필요하면 `select().where().first(1)` |
| 필터 | `.where({ f: { eq } })` | `eq` `neq` `gt` `gte` `lt` `lte` `contains` |
| 정렬 | `.orderBy({ f: 'desc' })` | 체이닝 |
| 관계 | `select(['rel.id','rel.name'])` | |
| 페이지 | `.first(n).after(cursor).executePaginated()` | `items` `hasNextPage` `endCursor` |
| 집계 | `.aggregate({...})` `.groupBy([...])` | 숫자 필드 필수 |
| 생성/수정/삭제 | `create` / `update(filter, data)` / `delete(filter)` | 삭제는 일치 행이 없어도 성공 |
| 업서트 | `upsert(where, create, update)` | 원자적이지 않음 |

주의점:
- `totalCount`는 채워지지 않는다. 전체 건수는 모든 페이지를 순회해서 센다.
- 집계 5종(`sum` `avg` `min` `max` `count`)은 모두 숫자 필드가 필요하고 단독 `count()`는 없다. 건수 집계용으로 `@int()` 필드를 두는 방법이 있다. [추정]
- 집계는 `select`/`orderBy`/`first`/`after`와 함께 쓸 수 없다. `where`는 가능.
- 관계는 `notebook: { id }` 객체로 지정한다.

## 7. 인증

[문서]
- **배포 앱은 Microsoft Entra ID(Fabric SSO)만 지원.** 이메일/비밀번호는 로컬 백엔드 전용. 첫 로그인 시 사용자 자동 생성(별도 가입 없음).
- 로그인: `ensureSignedInWithFabric(client.auth, { workspaceId, projectId, fabricPortalUrl, returnOrigin })` (`@microsoft/rayfin-auth-provider-fabric`)
  - 순서: 기존 세션 → 리프레시 → Fabric iframe 임베드 → 팝업
  - **팝업 단계는 클릭 등 사용자 동작 핸들러 안에서 호출**해야 한다. 5분 안에 완료.
- 세션: `client.auth.getSession()`, `client.auth.onSessionChange(cb)`, `client.auth.signOut()`. 세션에서 읽을 수 있는 값은 인증 여부, `user`(id/email), `rayfin.yml`의 커스텀 클레임. 토큰은 불투명하게 취급.
- 환경 변수: `VITE_RAYFIN_API_URL`, `VITE_RAYFIN_PUBLISHABLE_KEY`, `VITE_FABRIC_WORKSPACE_ID`, `VITE_FABRIC_ITEM_ID`, `VITE_FABRIC_PORTAL_URL`(생성 방식은 PoC에서 확인), `VITE_RAYFIN_HOSTING_URL`
- `allowedRedirectUris`: `returnOrigin`은 항목과 스킴·호스트·포트까지 정확히 일치해야 한다. 와일드카드 금지, 오래된 origin 정리. 변경 후 `rayfin up`.
- 커스텀 클레임(`services.auth.customClaims`)은 **앱 전체 공통 정적 값**이다(예: `tenant: default`). 사용자별 구분용이 아니다.
- 서비스 주체(service principal) 로그인은 도움말에 있으나 **현재 미지원** → CI/CD 자동 배포 제약.

## 8. 정적 호스팅

[문서]
- `assetAccess`: `protected`(로그인 + 앱 보기 권한 필요, 비대화형 배포 기본값) / `public`(URL을 아는 누구나). 변경은 **전체 `rayfin up`** 필요(`staticapp deploy`는 반영 안 함). 정적 파일 접근만 통제하며 API 권한을 대체하지 않는다.
- `folder`는 필수(기본값 없음), `root`로 하위 프런트엔드 폴더 지정 가능.
- 압축 ZIP 100MB 이하. 소스맵 제외, 이미지 압축, 바이너리는 Fabric Apps 스토리지로.
- 로컬 확인: `npm run build` → `npx serve dist`
- 문서 간 서술 차이: 호스팅 문서는 `/auth/callback` 경로가 자동 추가된다고 하고, 리다이렉트 URI 문서는 bare origin만 언급. 배포 후 `rayfin.yml`에서 실제 값을 확인할 것.

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

### 12-3. 요청 관리 앱 (가장 쓸만한 사례) [추정]
현업이 요청 등록(대상 테이블, 증상, 긴급도) → 담당자가 상태 변경·코멘트 → 현업은 본인 요청만 조회 → 월말 집계. 엔티티 후보: 요청, 코멘트, 담당자. 앱 전용 DB 대신 기존 SQL database/warehouse를 커넥터로 쓰는 선택지도 있다(application 모드에서는 `@role`에 전적으로 의존).

쓰지 않는 게 나은 경우: 단순 조회 리포트(Power BI가 간단), 복잡한 트랜잭션, 대규모 데이터 가공.

## 13. 미확인 항목 (남은 것)

| 항목 | 상태 |
|---|---|
| `claims.role`이 Fabric SSO에서 채워지는지, 담당자 역할 부여 방법 | 어떤 문서에도 없음. 커스텀 클레임은 정적 값. PoC에서 세션 클레임을 찍어 실측 |
| 담당자 구분의 현재 유일한 확정 수단 | `claims.email.eq('a@x.com').or(...)` 나열 (변경 시 재배포) |
| `@role` 옵션 키 `policy` vs `check` | 표는 `check`, 예제는 `policy` |
| `@role`이 없는 엔티티의 기본 접근 정책 | 미확인 |
| 권한 거부 시 `update`/`delete` 동작(에러 여부) | 미확인 |
| Functions 안에서 시맨틱 모델 커넥터 호출 가능 여부 | 미확인 |
| 시맨틱 모델 RLS가 delegated 실행에 적용되는지 | 미확인 |
| 앱 DB(`RayfinClient`)와 커넥터(`ConnectorsRayfinClient`) 한 앱 혼용 | 미확인 |
| 날짜 월별 그룹핑 지원 | 미확인 |
| `rayfin up` 후 `/auth/callback` 등록 여부 | 문서 간 서술 차이 |
| `@set` 필수 필드의 `default` 필요 여부 (create에서 `status` 제외 시) | 미확인 |
| 가격·라이선스 | 용량 할당이 필요하다는 것 외에 없음 |
| 아직 안 읽은 문서 | `anonymous-data-access`, `troubleshooting`, `create-app-with-cli`, `create-app-with-github-copilot`, `project-structure` 세부 |

## 14. 다음 할 일

- [ ] 사전 요건 확인: capacity 워크스페이스, 테넌트 설정, 지원 리전, Node 20+
- [ ] 개발 워크스페이스에서 PoC: 요청 관리 앱(엔티티 2~3개) 생성 → `npm run dev` → `npx rayfin up`
- [ ] PoC에서 로그인 후 세션 클레임 실측(`claims.role` 존재 여부)
- [ ] 권한 거부 시 동작, `@set` 기본값, 외래키 컬럼명 실측
- [ ] (선택) 자연어 → DAX → 시각화 PoC 설계 및 Fabric 기존 AI 기능과 비교

## 15. 출처 (Microsoft Learn, 2026-11-09 확인)

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
- https://learn.microsoft.com/en-us/fabric/apps/functions
- https://learn.microsoft.com/en-us/fabric/apps/functions-connect-external-resources
- https://learn.microsoft.com/en-us/fabric/apps/apply-schema-changes
- https://learn.microsoft.com/en-us/fabric/apps/connectors
- https://learn.microsoft.com/en-us/fabric/apps/hosting
