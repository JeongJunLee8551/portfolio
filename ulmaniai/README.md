# 채권담보 분석 서비스 - 동적 UI 구조화

## 📋 개요

부동산 시세관리 서비스 내 채권담보 분석 기능을 개발했습니다.

**플로우**: 주소 등록 → 상세정보 확인 → 등기정보조회 → 채권정보설정 → 보고서생성/출력

주소 등록을 제외한 전체 단계를 담당했습니다.

<br />

## 🚨 문제 상황

<img width="1203" height="692" alt="Image" src="https://github.com/user-attachments/assets/4a665a1e-ca9c-44c8-b282-53201f6d3105" />

### 복잡한 UI 요구사항

채권 담보로 설정하는 매물의 유형이 다양했습니다:

- 단독주택, 다가구, 상가주택, 아파트, 오피스텔 등

또한 점유 상태에 따라 각기 다른 UI를 보여줘야 했습니다:

- 거주중 / 임대중 / 거주+임대중

### 구체적인 문제들

1. **매물 유형 × 점유 상태 조합**에 따른 동적 테이블 UI 필요
2. **총 가구 수, 임차인 수 변경 시** 행 자동 생성/삭제 및 이용현황 자동 설정
3. **상가주택**처럼 주거+상가 섹션이 동시에 필요한 복합 케이스 존재
4. 고객사 요구에 따라 **수시로 변경**되는 상황

<br />

## ✅ 해결 방법

### 1. 유틸 함수로 행 생성 로직 분리

점유 상태에 따라 테이블 행을 자동 생성하는 `autoSetUsageStatus` 함수를 만들었습니다.

```
입력: totalCount, tenantCount, 현재 상태, 상가 여부
출력: 적절한 LeaseRow 배열
```

→ [occupancyUtils.ts](./occupancyUtils.ts)

### 2. 커스텀 훅으로 상태 관리 캡슐화

`residential` 또는 `commercial` 타입만 지정하면 해당 유형에 맞는 상태와 핸들러를 제공하는 훅을 만들었습니다.

```typescript
const {
  status,
  info,
  handleStatusChange,
  handleTotalCountChange,
  // ... 기타 핸들러
} = useOccupancySection({ type: "residential", initialStatus: "residence" });
```

→ [useOccupancySection.ts](./useOccupancySection.ts)

### 3. 컴포넌트 매핑으로 매물 유형별 UI 자동 렌더링

매물 분류 키에 따라 렌더링할 컴포넌트를 매핑했습니다.

```typescript
const COMPONENT_MAP: Record<ClassificationKey, JSX.Element> = {
  일반_단독주택: <ResidentialTypeSection />,
  일반_다가구주택: <ResidentialTypeSection />,
  일반_상가주택: (
    <>
      <ResidentialTypeSection selectBoxComment="주택 부분의 점유 상태를 선택해주세요" />
      <CommercialTypeSection selectBoxComment="상가 부분의 점유 상태를 선택해주세요" />
    </>
  ),
  집합_아파트: <ResidentialTypeSection />,
  집합_상가: <CommercialTypeSection />,
  // ...
};

// 사용
const key: ClassificationKey = "일반_상가주택";
return COMPONENT_MAP[key];
```

<br />

## 📊 결과

| 개선 항목            | 효과                                                             |
| -------------------- | ---------------------------------------------------------------- |
| **자동 렌더링**      | 매물 분류 키 하나로 어떤 UI 조합이든 자동 렌더링                 |
| **독립적 상태 관리** | 각 섹션이 독립적으로 상태 관리되어 복합 케이스에서도 안정적 동작 |
| **유지보수 용이**    | 기획 변경 시 유틸 함수만 수정하면 됨                             |
| **확장성**           | 새로운 매물 유형 추가 시 COMPONENT_MAP에 한 줄만 추가            |

<br />

## 📁 파일 구조

```
ulmaniai/
├── README.md                 # 현재 문서
├── occupancyUtils.ts         # 행 생성 유틸 함수
└── useOccupancySection.ts    # 상태 관리 커스텀 훅
```

<br />

## 🔗 관련 파일

- [occupancyUtils.ts](./occupancyUtils.ts) - 점유 상태별 행 생성 로직
- [useOccupancySection.ts](./useOccupancySection.ts) - 상태 관리 커스텀 훅
