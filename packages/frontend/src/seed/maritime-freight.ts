/**
 * 초기 데이터: "해상운임 계산 로직 정리 (Power BI Measure 기준)".
 *
 * 1부(용어·약어 정리) → 표준 단어, 2부(계산 로직 계층 구조) → 표준 계산식,
 * 계층도에서 한글 이름이 붙은 상위 개념 → 표준 용어.
 * 문서에 없는 내용은 넣지 않았고, 문서가 '미확인'이라고 한 부분은 notes에 그대로 남겼다.
 *
 * 이 데이터는 "초기 데이터 불러오기" 버튼으로만 등록되며, 이미 같은 이름이 있으면 건너뛴다.
 */

export interface WordSeed {
  word: string;
  formalName: string;
  description: string;
  category: string;
}

export interface TermSeed {
  name: string;
  abbreviation: string;
  definition: string;
  category: string;
  relatedWords: string;
}

export interface FormulaSeed {
  name: string;
  title: string;
  unit: string;
  expression: string;
  description: string;
  dependsOn: string;
  notes: string;
  category: string;
  depth: number;
}

const w = (
  category: string,
  word: string,
  formalName: string,
  description: string
): WordSeed => ({ category, word, formalName, description });

export const WORD_SEEDS: readonly WordSeed[] = [
  // 1-1. 선형 (Vessel Type)
  w('선형', 'PANAMAX', '파나막스', '파나마 운하 통과 가능 규모'),
  w('선형', 'KAMSARMAX', '캄사르막스', '기니 Kamsar항 입항 가능 최대 규모, 약 82k DWT'),
  w('선형', 'HANDYMAX', '핸디막스', '약 35~45k DWT 소형 벌크선. Hold 1~5'),
  w('선형', 'ULTRAMAX', '울트라막스', '수프라막스 확장형, 약 60k DWT. Hold 1~5'),
  w('선형', 'SIZE', '', '대표 선박 규모 (k = 1,000 DWT)'),

  // 1-2. 적재량 (Cargo Intake)
  w('적재량', 'DWT', 'Deadweight Tonnage', '재화중량톤수. 화물·연료·물·선원 등 총 최대 중량(MT)'),
  w('적재량', 'Draft', 'SSW Draft (Summer Salt Water)', '하계 만재흘수. 최대 적재 시 잠기는 깊이(m)'),
  w('적재량', 'TPC', 'Tons Per Centimeter', '흘수 1cm당 필요 화물 중량(MT/cm)'),
  w('적재량', 'Restrictn', 'Restriction', '항만·수로의 흘수 제한(m)'),
  w('적재량', 'Draft Cut', '', '흘수 제한값을 목록에서 선택하는 옵션'),
  w('적재량', 'GRAIN CAPA', 'Grain Capacity', '벌크 화물 만재 시 총 용적(CBM)'),
  w('적재량', 'Hold 1~7', '', '화물창별 적재 가능 용적(CBM)'),
  w('적재량', 'S/F', 'Stowage Factor', '적부계수. 화물 1톤이 차지하는 공간(ft³/MT). 낮으면 고밀도'),
  w('적재량', 'Bod, FW, C', 'Bunkers on board, Fresh Water, Constants', '적재량에서 공제하는 선내 중량(MT)'),
  w('적재량', 'Cargo_NU', 'Cargo Nominated Quantity', '계약 명목 수량(MT)'),
  w('적재량', 'Cargo_Per', 'Cargo Percentage', '수량 허용 오차율 (more or less)'),
  w('적재량', '합적', 'Combined Shipment', '여러 화물을 Hold별로 나눠 싣는 방식'),
  w('적재량', '35.315', '', 'CBM → ft³ 환산 계수 (정확히는 35.3147)'),

  // 1-3. 항해·작업 일수 (Voyage Duration)
  w('항해·작업 일수', 'Port_Sea', '', '기본 해상 항해 일수'),
  w('항해·작업 일수', 'Port_Idle', '', '항만 대기·정박 일수'),
  w('항해·작업 일수', 'Working Days', '', '선적·하역 작업 일수'),
  w('항해·작업 일수', 'Laytime', '정박기간', '하역을 위해 용선자에게 계약상 허용된 기간'),
  w('항해·작업 일수', 'L term', 'Loading Term', '선적항 하역 속도(MT/일)'),
  w('항해·작업 일수', 'D term', 'Discharging Term', '양하항 하역 속도(MT/일)'),
  w('항해·작업 일수', 'Working_calc', '', '선적·양하 구성 유형 (1~5)'),
  w('항해·작업 일수', 'Working_calc+', '', '작업 일수 가산분'),
  w('항해·작업 일수', 'Margine', 'Sea Margin', '해상 구간 여유율. 날씨·조류 지연 대비'),
  w('항해·작업 일수', 'α (Alpha)', 'Port_Dist', '추가 항해 거리'),
  w('항해·작업 일수', 'β (Beta)', 'Port_Idle', '추가 대기 일수'),
  w('항해·작업 일수', 'Speed (L)', 'Laden Speed', '만재 항해 속력(knot)'),
  w('항해·작업 일수', 'z', '', 'α를 일수로 환산한 값'),
  w('항해·작업 일수', 'Duration', '', '총 항해 일수'),

  // 1-4. 용선료 (Hire)
  w('용선료', 'H/B', 'Hire Base', '일일 용선료 기준값'),
  w('용선료', 'FFA', 'Forward Freight Agreement', '선도 운임 계약 지수. 월·분기·SPOT'),
  w('용선료', 'SPOT', '', '현물 시점 지수'),
  w('용선료', 'I (I1, I2, I3)', 'Index', '항로 구성 인덱스 1~3'),
  w('용선료', '구분', '', '지수 종류 코드. 선형 식별자(P/H/S) 포함'),
  w('용선료', 'Add Comm', 'Address Commission', '용선자에게 지급하는 수수료. 통상 1.25%, 사실상 운임 인하 효과'),
  w('용선료', 'TTL hire', 'Total Hire', '용선료 총액'),

  // 1-5. 체선·조출 (Laytime Settlement)
  w('체선·조출', 'DEM', 'Demurrage', '체선료. 정박기간 초과 시 화주가 선주에게 지급'),
  w('체선·조출', 'DES', 'Despatch', '조출료. 정박기간 전 완료 시 선주가 화주에게 지급'),
  w('체선·조출', 'DHD', 'Despatch Half Demurrage', '조출료 = 체선료의 1/2. 업계 표준 관행'),
  w('체선·조출', 'Countable', '', 'DEM/DES 적용 대상 여부·횟수 (선적항/양하항별)'),
  w('체선·조출', 'DEM추가', '', '체선료 가산액'),

  // 1-6. 연료 (Bunker)
  w('연료', 'IFO', 'Intermediate Fuel Oil', '중유'),
  w('연료', 'Ulsfo', 'Ultra Low Sulphur Fuel Oil', '초저유황유'),
  w('연료', 'MDO', 'Marine Diesel Oil', '선박용 경유'),
  w('연료', '(PW)', 'Port Working', '항만 작업 중 소비량'),
  w('연료', '(L)', 'Laden', '만재 항해 소비량'),
  w('연료', '(PI)', 'Port Idle', '항만 대기 소비량'),
  w('연료', '(Sea)', '', '해상 항해 소비량'),
  w('연료', '급유지', 'Bunker Port Price', '급유 항구 연료 단가($/MT)'),
  w('연료', 'Q/P', 'Quantity × Price', '소비량 × 단가 = 연료비'),

  // 1-7. 비용·운임 (Cost & Freight)
  w('비용·운임', 'EU ETS', 'EU Emissions Trading System', 'EU 배출권 거래제 비용'),
  w('비용·운임', 'CVE', 'Cable, Victuals and Entertainment', '통신·식료·접대비. 월정액'),
  w('비용·운임', 'TCL', '', '연 단위 안분 비용 ⚠️ 정확한 정의 미확인'),
  w('비용·운임', 'Charge_SUM', '', '항비 등 기타 비용 합계'),
  w('비용·운임', 'Charge(x)', '', '사용자 직접 입력 추가 비용'),
  w('비용·운임', '영점조정', 'Zero Margin', '선형별 마진율'),
  w('비용·운임', 'freight_plus', '', '최종 운임 가산액'),
  w('비용·운임', '0.0125', '', '1.25% 고정 공제율 (Address Commission 상당)'),
  w('비용·운임', 'Freight Rate', '운임', '화물 1톤당 해상운임($/MT). 최종 산출 목표'),
];

const TERM_CATEGORY = '운임 계산';

export const TERM_SEEDS: readonly TermSeed[] = [
  {
    name: '최종 운임',
    abbreviation: 'Freight Rate',
    definition:
      '화물 1톤당 해상운임($/MT). 최종 산출 목표. (분자 ÷ 분모) + freight_plus로 계산한다.',
    category: TERM_CATEGORY,
    relatedWords: 'Freight Rate, freight_plus, 영점조정',
  },
  {
    name: '적재량',
    abbreviation: 'Loable qtty',
    definition:
      '계약 한도, 용적 한도, 흘수 한도 중 가장 작은 값(Revenue T)을 기준으로 한다. 합적(여러 화물을 Hold별로 나눠 싣는 방식)을 선택하면 Hold별 적재 합계가 합적 한도로 적용된다.',
    category: TERM_CATEGORY,
    relatedWords: 'DWT, Draft, TPC, Restrictn, S/F, Cargo_NU, Cargo_Per, 합적',
  },
  {
    name: '총 항해 일수',
    abbreviation: 'Duration',
    definition: '해상 구간, 항만 대기, 하역 작업 일수로 구성되는 총 항해 일수.',
    category: TERM_CATEGORY,
    relatedWords: 'Duration, Port_Sea, Port_Idle, Working Days, Margine',
  },
  {
    name: '일일 용선료',
    abbreviation: 'H/B',
    definition:
      'Hire Base. FFA(선도 운임 계약 지수) 기간과 선형별 지수(I1~I3)로부터 코드별 계산식으로 산출하는 일일 용선료 기준값.',
    category: TERM_CATEGORY,
    relatedWords: 'H/B, FFA, SPOT',
  },
  {
    name: '체선·조출 정산',
    abbreviation: 'DEM/DES',
    definition:
      '체선료(DEM)와 조출료(DES)를 선적항·양하항별로 계산하는 정산. 조출료는 체선료의 1/2(DHD)이다.',
    category: TERM_CATEGORY,
    relatedWords: 'DEM, DES, DHD, Laytime, Countable',
  },
  {
    name: '연료비',
    abbreviation: 'Bunker Cost',
    definition: 'IFO, Ulsfo, MDO 소비량에 급유지 단가를 곱해 산출하는 연료비(Q/P).',
    category: TERM_CATEGORY,
    relatedWords: 'IFO, Ulsfo, MDO, 급유지, Q/P',
  },
  {
    name: '기타 비용',
    abbreviation: 'Charge_Sum',
    definition:
      '항비 등 기타 비용(Charge_SUM)에 EU ETS, CVE, TCL, 사용자 입력 비용(Charge(x))을 더한 합계.',
    category: TERM_CATEGORY,
    relatedWords: 'EU ETS, CVE, TCL, Charge_SUM, Charge(x)',
  },
  {
    name: '용선료 총액',
    abbreviation: 'TTL hire',
    definition: 'Total Hire. 일일 용선료(H/B) × 총 항해 일수 × (1 − Add Comm).',
    category: TERM_CATEGORY,
    relatedWords: 'TTL hire, H/B, Add Comm',
  },
];

const C0 = '최상위 운임';
const C1 = '[1] 적재량';
const C2 = '[2] 총 항해 일수';
const C3 = '[3] 일일 용선료 (H/B)';
const C4 = '[4] 체선·조출 정산 (DEM/DES)';
const C5 = '[5] 연료비 (Bunker Cost)';
const C6 = '[6] 기타 비용';
const C7 = '[7] 용선료 총액 (TTL hire)';

const f = (
  category: string,
  depth: number,
  name: string,
  title: string,
  unit: string,
  expression: string,
  description = '',
  dependsOn = '',
  notes = ''
): FormulaSeed => ({ category, depth, name, title, unit, expression, description, dependsOn, notes });

const HB_CODE_NOTE = '지수 코드 A~G 중 하나로 계산한다(기본 A). S = I1~I3 합계, A = 평균.';

export const FORMULA_SEEDS: readonly FormulaSeed[] = [
  // 최상위
  f(
    C0, 0, '@Freight', '최종 해상운임', '$/MT',
    '(분자 ÷ 분모) + freight_plus',
    '분자 = 영점조정 × (DEM+DES) + 총비용 + TTL hire − (DEM+DES)\n분모 = (1 − 0.0125 − 영점조정) × Loadable qtty',
    '@Loable qtty, @DEM, @DES, @TTL hire',
    '총비용은 출처 문서의 계층도에 별도 항목으로 정의되어 있지 않음.'
  ),

  // [1] 적재량
  f(
    C1, 1, '@Loable qtty', '적재량', '', '',
    '하위 항목: @Selected ST Mode(합적 O/X 선택), @Revenue T(세 한도 중 최솟값), @ST Loable SUM (DWT)(합적 한도, 합적O일 때만).',
    '@Selected ST Mode, @Revenue T, @ST Loable SUM (DWT)'
  ),
  f(C1, 2, '@Selected ST Mode', '합적 모드 선택', '', '', '합적O / 합적X 선택'),
  f(
    C1, 2, '@Revenue T', '', '', 'MIN(@Max Load, @Hold Load, @Cut Load)',
    '세 가지 한도 중 최솟값', '@Max Load, @Hold Load, @Cut Load'
  ),
  f(C1, 3, '@Max Load', '계약 한도', '', 'Cargo_NU × (1 + Cargo_Per)'),
  f(
    C1, 3, '@Hold Load', '용적 한도', '', 'Hold Capa ÷ @SF  (CBM이면 × 35.315)', '', '@SF'
  ),
  f(
    C1, 4, '@SF', '적부계수', 'ft³/MT', '',
    '합적X: Cargo 선택값 → Cargo[SF] 조회\n합적O 또는 미선택: 기본 S/F'
  ),
  f(
    C1, 3, '@Cut Load', '흘수 한도', '',
    'DWT − (Draft − MIN(Draft, @Restrictn)) × TPC × 100 − Bod,FW,C', '', '@Restrictn'
  ),
  f(
    C1, 4, '@Restrictn', '흘수 제한', 'm', '',
    '우선순위: ① @Restrictn Override (파라미터, ≠0이면 최우선) ② @Draft Cut (드롭다운 선택) ③ Loadable Raw[Restrictn] (기본값)'
  ),
  f(
    C1, 2, '@ST Loable SUM (DWT)', '합적 한도', '', 'Σ @Hold1~7 Lodable',
    '합적O일 때만 적용', '@HoldN Lodable'
  ),
  f(
    C1, 3, '@HoldN Lodable', 'Hold별 적재량', '', '@HoldN Capacity ÷ @HoldN ft',
    'Hold6·7은 HANDYMAX/ULTRAMAX면 BLANK', '@HoldN Capacity, @HoldN ft'
  ),
  f(
    C1, 4, '@HoldN Capacity', 'Hold별 용적', 'CBM', '',
    'ST_Data[HoldN], @Ship으로 필터', '@Ship'
  ),
  f(
    C1, 5, '@Ship', '선형 구분', '', '',
    '구분 첫 글자 → P=KAMSARMAX / H=HANDYMAX / S=ULTRAMAX', '', '⚠️ PANAMAX 미분류'
  ),
  f(
    C1, 4, '@HoldN ft', 'Hold별 적부계수', '', '',
    'Cargo[ft], @HoldN Selected Cargo로 조회', '@HoldN Selected Cargo'
  ),
  f(C1, 5, '@HoldN Selected Cargo', 'Hold별 선택 화물', '', '', 'HoldN_Cargo[CARGO] (합적O일 때만)'),

  // [2] 총 항해 일수
  f(
    C2, 1, '@Duration', '총 항해 일수', '일', '',
    '하위 항목: @PortSea(해상 구간), @PortIdle(항만 대기), @Working Days(하역 작업).',
    '@PortSea, @PortIdle, @Working Days'
  ),
  f(
    C2, 2, '@PortSea', '해상 구간', '일',
    'Port_Sea + @z × (1 + @Margine) + Margine_SUM × @Margine', '', '@z, @Margine'
  ),
  f(C2, 3, '@z', 'α를 일수로 환산', '일', '@Alpha ÷ @Speed_L ÷ 24', '', '@Alpha'),
  f(C2, 4, '@Alpha', '추가 항해 거리', '', '', 'Port_Dist(α) 파라미터'),
  f(
    C2, 3, '@Margine', '해상 여유율', '', '',
    '@Margine Override ≠0이면 Override, 아니면 @Margine Base'
  ),
  f(C2, 2, '@PortIdle', '항만 대기', '일', 'Port_Idle + @Beta', '', '@Beta'),
  f(C2, 3, '@Beta', '추가 대기 일수', '일', '', 'Port_Idle(β) 파라미터'),
  f(
    C2, 2, '@Working Days', '하역 작업 일수', '일',
    '(Working_calc 유형별 식) + Working_calc+',
    '입력: @Loable qtty (적재량에 의존)',
    '@Loable qtty, @LTerm1/2, @DTerm1/2/3'
  ),
  f(
    C2, 3, '@LTerm1/2', '선적항 하역 속도', 'MT/일', '',
    '@LTerm1/2 Override ≠0이면 Override, 아니면 기본값'
  ),
  f(
    C2, 3, '@DTerm1/2/3', '양하항 하역 속도', 'MT/일', '',
    '@DTerm1/2/3 Override ≠0이면 Override, 아니면 기본값'
  ),

  // [3] 일일 용선료
  f(
    C3, 1, '@H/B', '일일 용선료', '', '',
    '하위 항목: @Selected FFA, 지수 조회(Reference_지수_MAX), 코드별 계산(A~G).',
    '@Selected FFA, @Duration'
  ),
  f(
    C3, 2, '@Selected FFA', 'FFA 기간 선택', '', '',
    '미선택 시 @Default FFA (Name) ← Name_Reference[FFA]'
  ),
  f(
    C3, 2, '지수 조회 (Reference_지수_MAX)', '지수 조회', '', '',
    '키: Name_Reference[구분] + @Selected FFA → I1, I2, I3 (인덱스별), S = 합계, A = 평균'
  ),
  f(C3, 2, '@H/B (코드 A)', '', '', 'S', HB_CODE_NOTE),
  f(C3, 2, '@H/B (코드 B)', '', '', 'A', HB_CODE_NOTE),
  f(C3, 2, '@H/B (코드 C)', '', '', 'S × 1.05', HB_CODE_NOTE),
  f(C3, 2, '@H/B (코드 D)', '', '', 'S × 15 ÷ @Duration', HB_CODE_NOTE, '@Duration'),
  f(C3, 2, '@H/B (코드 E)', '', '', '(I3×40 + I2×20 − I1×20) ÷ 40', HB_CODE_NOTE),
  f(C3, 2, '@H/B (코드 F)', '', '', 'I1 + I2 − I3', HB_CODE_NOTE),
  f(C3, 2, '@H/B (코드 G)', '', '', 'I2 − (I1 × 15 ÷ @Duration)', HB_CODE_NOTE, '@Duration'),

  // [4] 체선·조출 정산
  f(C4, 1, '@DEM(선적항)', '선적항 체선료', '', '@H/B + @DEM_추가', '', '@H/B'),
  f(
    C4, 1, '@DES(선적항)', '선적항 조출료', '', '@DEM(선적항) ÷ 2',
    'DHD: 조출료 = 체선료의 1/2', '@DEM(선적항)'
  ),
  f(
    C4, 1, '@DEM(양하항)', '양하항 체선료', '',
    'Name에 "TW" 포함 시 10,000, 아니면 @DEM(선적항)', '', '@DEM(선적항)'
  ),
  f(C4, 1, '@DES(양하항)', '양하항 조출료', '', '@DEM(양하항) ÷ 2', '', '@DEM(양하항)'),
  f(
    C4, 1, '@DEM', '최종 체선료', '',
    '@Countable_선적항 × (>0 ? DEM(선적항) : DES(선적항))', '',
    '@DEM(선적항), @DES(선적항)'
  ),
  f(
    C4, 1, '@DES', '최종 조출료', '',
    '@Countable_양하항 × (>0 ? DEM(양하항) : DES(양하항))', '',
    '@DEM(양하항), @DES(양하항)'
  ),

  // [5] 연료비
  f(
    C5, 1, '@IFO', 'IFO 소비량', '',
    '상수 + @Working Days×IFO(PW) + @z×IFO(L) + @z×@Margine×IFO(L) + @Beta×IFO(PI)', '',
    '@Working Days, @z, @Margine, @Beta'
  ),
  f(
    C5, 1, '@MDO', 'MDO 소비량', '',
    '상수 + @Working Days×MDO(PW) + (@z + @z×Margine)×MDO(Sea) + @Beta×MDO(PW)', '',
    '@Working Days, @z, @Beta',
    '⚠️ 여기만 HB Working Raw[Margine]을 직접 참조함 (Override 미반영)'
  ),
  f(C5, 1, '@Ulsfo', 'Ulsfo 소비량', '', 'Ulsfo_상수'),
  f(C5, 1, '@IFO(Q/P)', 'IFO 연료비', '', '@IFO × @급유지', '', '@IFO'),
  f(C5, 1, '@Ulsfo(Q/P)', 'Ulsfo 연료비', '', '@Ulsfo × (@급유지 + @급유지_추가)', '', '@Ulsfo'),
  f(C5, 1, '@MDO(Q/P)', 'MDO 연료비', '', '@MDO × @급유지', '', '@MDO'),

  // [6] 기타 비용
  f(
    C6, 1, '@Charge_Sum', '기타 비용 합계', '',
    'Charge_SUM + @EU ETS + @CVE + @TCL + @Charge(x)', '',
    '@EU ETS, @CVE, @TCL, @Charge(x)'
  ),
  f(
    C6, 2, '@EU ETS', 'EU 배출권 비용', '',
    'A : @IFO×63.02 + @MDO×64.12   (EEA 출입, 배출 50%)\nB : @IFO×126.04 + @MDO×128.24   (EEA 역내, 배출 100%)\nC : (@IFO+Ulsfo_상수)×63.02 + @MDO×64.12\n그 외 : 0',
    '배출권 €40/tCO₂ 가정', '@IFO, @MDO'
  ),
  f(C6, 2, '@CVE', '통신·식료·접대비 일할', '', 'CVE × @Duration ÷ 30', '월정액 일할', '@Duration'),
  f(
    C6, 2, '@TCL', '연 단위 안분 비용', '', '43,000 × 0.407 × @Duration ÷ 365', '', '@Duration',
    '⚠️ 정의 미확인'
  ),
  f(C6, 2, '@Charge(x)', '사용자 입력 추가 비용', '', '사용자 입력 파라미터'),

  // [7] 용선료 총액
  f(
    C7, 1, '@TTL hire', '용선료 총액', '', '@H/B × @Duration × (1 − Add Comm)', '',
    '@H/B, @Duration'
  ),
];
