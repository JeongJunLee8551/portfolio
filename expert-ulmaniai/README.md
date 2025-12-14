# 매물관리 서비스 - 상태관리 리팩토링

## 📋 개요

매물관리 서비스의 유지보수를 담당하며, 고객사의 기능 수정 요청과 오류 수정을 대응했습니다.

**요청 내용**: 매물 수정 완료 후 기존에 보던 페이지 번호를 유지해주세요.

이 요청을 처리하는 과정에서 기존 코드의 구조적 문제를 발견하고 개선했습니다.

<br />

## 🚨 문제 발견

### 기존 코드 분석

기능 구현을 위해 기존 코드를 분석하던 중 여러 문제를 발견했습니다:

#### 1. react-hook-form의 부적절한 사용

```typescript
// ❌ 기존 코드: 폼 검증이 필요 없는 단순 상태를 form으로 관리
const methods = useForm({
  defaultValues: {
    propStatus: "전체",
  },
});

<FormProvider {...methods}>
  <PropListSearchBar />
  <PropList />
</FormProvider>;
```

#### 2. useWatch 남발로 인한 문제

```typescript
// ❌ 기존 코드: useWatch로 여러 상태 추적
const { setValue, control } = useFormContext();
const propStatus = useWatch({ control, name: "propStatus" });
const filter = useWatch({ control, name: "filter" });
const search = useWatch({ control, name: "search" });
```

**문제점:**

- 폼 검증이 필요 없는 단순 상태를 form으로 관리 → 불필요한 복잡도
- `useWatch`로 인한 불필요한 리렌더링
- 데이터 흐름이 form context에 숨어있어 추적 어려움
- PropList 컴포넌트가 FormProvider에 강하게 결합되어 재사용 불가

#### 3. 페이지 리셋 로직 버그

```typescript
// ❌ 기존 코드: 필터 변경 시 page=1로 리셋하는 로직
useEffect(() => {
  // 이 로직이 라우터 이동 시에도 동작함!
  // 매물 상세 → 리스트 이동 시 항상 1페이지로 돌아감
  router.replace("?page=1");
}, [filter, propStatus]);
```

<br />

## ✅ 해결 방법

### 1. react-hook-form → useState + props 전환

폼 검증이 필요 없는 단순 상태는 useState로 관리하고, Props로 전달하는 구조로 변경했습니다.

```typescript
// ✅ 변경 후: 부모 컴포넌트에서 상태 관리
export default function PropListPage() {
  const [propStatus, setPropStatus] = useState<string>("전체");
  const [filter, setFilter] = useState<FilterType>({
    매물유형대분류: "전체",
    매물유형중분류: "전체",
    거래종류: "전체",
    업로더: "전체",
  });
  const [search, setSearch] = useState<string>("");

  return (
    <>
      <PropListSearchBar
        propStatus={propStatus}
        filter={filter}
        onPropStatusChange={setPropStatus}
        onFilterChange={setFilter}
      />
      <PropList
        propStatus={propStatus}
        filter={filter}
        search={search}
        onSearchChange={setSearch}
      />
    </>
  );
}
```

### 2. 명확한 Props 인터페이스 정의

```typescript
// ✅ 변경 후: Props로 명시적인 계약
interface PropListProps {
  propStatus: string;
  filter: FilterType;
  search: string;
  onSearchChange: (value: string) => void;
  onRecall: () => void;
}

const PropList = ({
  propStatus,
  filter,
  search,
  onSearchChange,
  onRecall,
}: PropListProps) => {
  // useFormContext, useWatch 제거됨
  // Props로 받은 값을 직접 사용
};
```

### 3. URL을 Single Source of Truth로 설정

페이지네이션 상태를 URL searchParams로 관리하도록 변경했습니다.

```typescript
// ✅ URL → State 단방향 동기화
useEffect(() => {
  const pageFromURL = searchParams.get("page");

  if (!pageFromURL) {
    // page param이 없으면 1로 설정
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
    return;
  }

  // URL의 값을 State에 동기화
  setPage(Number(pageFromURL));
}, [searchParams]);
```

### 4. 초기화 플래그 패턴으로 마운트/필터변경 구분

첫 마운트 시에는 URL 페이지를 유지하고, 실제 필터 변경 시에만 page=1로 리셋합니다.

```typescript
// ✅ 초기화 플래그로 첫 마운트 구분
const isInitializedRef = useRef(false);
const previousFiltersRef = useRef({ /* 이전 필터 값 */ });

// 초기화 useEffect
useEffect(() => {
  if (!isInitializedRef.current) {
    // 첫 마운트: 현재 값으로 초기화만 하고 리셋하지 않음
    previousFiltersRef.current = { /* 현재 필터 값 */ };
    isInitializedRef.current = true;
  }
}, [/* dependencies */]);

// 필터 변경 감지 useEffect
useEffect(() => {
  // 초기화 전에는 실행하지 않음
  if (!isInitializedRef.current) return;

  // 실제 필터 값 변경 확인
  const filterChanged = /* 이전 값과 비교 */;

  if (filterChanged) {
    // 필터가 변경된 경우에만 page=1로 리셋
    router.replace('?page=1', { scroll: false });
  }
}, [/* filter dependencies - searchParams 제외! */]);
```

<br />

## 📊 데이터 흐름 비교

### Before: Form Context 기반

```
┌─────────────────────────────────┐
│  FormProvider                   │
│  (상태가 context에 숨어있음)      │
│                                 │
│   ┌──────────┐  ┌──────────┐   │
│   │SearchBar │  │ PropList │   │
│   │          │  │          │   │
│   │useWatch()│  │useWatch()│   │
│   │setValue()│  │setValue()│   │
│   └──────────┘  └──────────┘   │
│                                 │
│   데이터 흐름 추적 어려움 ❌      │
└─────────────────────────────────┘
```

### After: Props 기반 단방향 흐름

```
┌─────────────────────────────────────────┐
│  Page.tsx (상태 관리)                    │
│                                         │
│  const [propStatus, setPropStatus]      │
│  const [filter, setFilter]              │
│  const [search, setSearch]              │
└──────────┬──────────────────────────────┘
           │
           │ Props Down ⬇️
           │
    ┌──────┴──────────┐
    │                 │
    ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ SearchBar    │  │ PropList     │
│              │  │              │
│ • propStatus │  │ • propStatus │
│ • filter     │  │ • filter     │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │ Callbacks Up ⬆️ │
       │                 │
       ▼                 ▼
  onPropStatusChange  onSearchChange
  onFilterChange
```

<br />

## 📊 결과

| 개선 항목       | Before                       | After                             |
| --------------- | ---------------------------- | --------------------------------- |
| **페이지 유지** | 라우터 이동 시 항상 1페이지  | 라우터 이동 시 페이지 유지 ✅     |
| **필터 리셋**   | 버그로 인해 불안정           | 필터 변경 시에만 1페이지 리셋 ✅  |
| **리렌더링**    | useWatch로 불필요한 리렌더링 | 필요한 경우만 리렌더링 ✅         |
| **데이터 흐름** | context에 숨어있음           | Props로 명확하게 추적 가능 ✅     |
| **재사용성**    | FormProvider 의존            | Props 인터페이스로 재사용 가능 ✅ |
| **디버깅**      | 어려움                       | 쉬움 ✅                           |

<br />

## 💡 배운 점

### 1. 도구의 적절한 사용

react-hook-form은 **폼 검증이 필요한 경우**에 적합합니다. 단순 상태 관리에는 useState + props가 더 적절합니다.

### 2. 기능 추가 전 리팩토링

기존 코드에 문제가 있다면, **먼저 리팩토링을 진행**하고 기능을 추가하는 것이 장기적으로 더 효율적입니다.

### 3. Single Source of Truth

페이지네이션처럼 **URL에 저장해야 하는 상태**는 URL을 진실의 원천으로 삼고, State는 URL을 따라가도록 설계해야 합니다.

<br />

## 🔗 적용 가능한 다른 페이지

이 패턴은 다음과 같은 조건을 지닌 페이지에도 적용 가능합니다:

**조건:**

- 복잡한 폼 검증이 필요 없는 경우
- 리스트 + 필터 + 검색 조합
- 페이지네이션이 필요한 경우
