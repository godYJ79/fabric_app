# 시멘틱 모델 스키마 조회

판매 현황 대시보드를 만들기 전에, 연결한 시멘틱 모델의 **테이블·열·측정값·관계**를 읽어 옵니다.
읽기 전용 DAX(`INFO.VIEW.*`)만 사용하며, 데이터 값은 가져오지 않습니다.

## 순서

1. 모델 찾기 (워크스페이스 ID는 Fabric 주소창의 `groups/` 뒤 값)

   ```bash
   npx rayfin connector search "SementicModel_INZI" --type fabric-semanticmodel --workspace-id <워크스페이스 ID> --json
   ```

   결과에서 `itemId`와 `addCommand`를 확인합니다.

2. 커넥터 추가 (출력된 `addCommand`를 그대로 실행해도 됩니다)

   ```bash
   npx rayfin connector add --type fabric-semanticmodel --workspace-id <워크스페이스 ID> --item-id <itemId> --name salesmodel
   ```

   명령이 마지막에 출력하는 `npm install -w @rayfin-app/frontend …` 줄을 **그대로** 실행합니다.

3. 연결 확인 (**처음 한 번은 `--json` 없이** 실행합니다)

   ```bash
   npx rayfin connector invoke salesmodel executeQuery --file inspection/01-scope.query.json
   ```

   처음에는 Power BI 사용 동의 창이 나올 수 있습니다. 동의해야 이후 명령이 동작합니다.
   `--json`을 붙이면 동의 창을 띄우지 못하고 실패합니다.

4. 스키마 조회 (결과가 `inspection\results\`에 저장됩니다)

   ```bash
   inspection\run-discovery.cmd salesmodel
   ```

## 주의

- `inspection/results/`는 `.gitignore`에 들어 있어 **커밋되지 않습니다.** 모델의 테이블·열 이름은 업무 정보이므로
  공개 저장소에 올리지 마세요.
- DAX는 따옴표와 괄호가 많아 `--input` 대신 `--file`(JSON 파일)로 전달합니다. `.query.json`은 `{ "query": "…" }` 형식입니다.
- `connector add`는 `rayfin/rayfin.yml`에 워크스페이스·항목 ID를 기록합니다. 저장소 공개 범위를 확인한 뒤 커밋하세요.
