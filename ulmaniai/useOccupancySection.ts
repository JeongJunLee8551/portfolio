import { useState } from 'react';
import {
  autoSetUsageStatus,
  OccupancyStatus,
  SectionInfo
} from './occupancyUtils';

/**
 * 점유 상태별 정보를 저장하는 Record 타입
 * 상태 전환 시에도 각 상태의 데이터가 유지됩니다.
 */
type InfoRecord = Record<OccupancyStatus, SectionInfo>;

type UseOccupancySectionProps = {
  /** 섹션 타입: 주거용 또는 상업용 */
  type: 'residential' | 'commercial';
  /** 초기 점유 상태 */
  initialStatus: OccupancyStatus;
  /** 초기 이용 현황 (선택) */
  initialUsage?: string;
};

/**
 * 타입에 맞는 초기 상태 생성
 *
 * residential: residence, rent, both
 * commercial: self-use, rent, both
 */
const createInitialInfoState = (type: 'residential' | 'commercial'): InfoRecord => {
  const statuses: OccupancyStatus[] = type === 'commercial'
    ? ['self-use', 'rent', 'both']
    : ['residence', 'rent', 'both'];

  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        totalCount: '1',
        tenantCount: '0',
        leaseRows: [{
          id: '1',
          usage: status,
          deposit: '',
          rent: '',
        }],
      },
    ])
  ) as InfoRecord;
};

/**
 * 점유 섹션 상태 관리 커스텀 훅
 *
 * @description
 * 매물의 점유 상태(거주/임대/거주+임대)에 따른 UI 상태를 관리합니다.
 * 'residential' 또는 'commercial' 타입만 지정하면 해당 유형에 맞는
 * 상태와 핸들러를 제공합니다.
 *
 * @example
 * // 주거용 섹션
 * const {
 *   status,
 *   info,
 *   handleStatusChange,
 *   handleTotalCountChange,
 * } = useOccupancySection({ type: 'residential', initialStatus: 'residence' });
 *
 * @example
 * // 상업용 섹션
 * const commercialSection = useOccupancySection({
 *   type: 'commercial',
 *   initialStatus: 'self-use'
 * });
 *
 * @example
 * // 상가주택의 경우 두 섹션을 동시에 사용
 * const residentialSection = useOccupancySection({ type: 'residential', initialStatus: 'residence' });
 * const commercialSection = useOccupancySection({ type: 'commercial', initialStatus: 'self-use' });
 */
export const useOccupancySection = ({
  type,
  initialStatus,
  initialUsage = '',
}: UseOccupancySectionProps) => {
  const isCommercial = type === 'commercial';

  const [status, setStatus] = useState<OccupancyStatus>(initialStatus);
  const [info, setInfo] = useState<InfoRecord>(createInitialInfoState(type));

  /**
   * 점유 상태 변경 핸들러
   * 상태 변경 시 해당 상태의 행 데이터를 자동으로 재생성합니다.
   */
  const handleStatusChange = (newStatus: OccupancyStatus) => {
    const currentInfo = info[newStatus];
    const newRows = autoSetUsageStatus(
      Math.max(Number(currentInfo.totalCount) || 0, 1),
      Number(currentInfo.tenantCount) || 0,
      currentInfo.leaseRows,
      newStatus,
      isCommercial
    );

    setStatus(newStatus);
    setInfo((prev) => ({
      ...prev,
      [newStatus]: {
        ...prev[newStatus],
        leaseRows: newRows,
      },
    }));
  };

  /**
   * 총 가구/임대 수 변경 핸들러
   * 행 개수가 자동으로 조정됩니다.
   */
  const handleTotalCountChange = (value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    const newRowCount = Math.max(Number(onlyNumbers) || 0, 1);

    const currentInfo = info[status];
    const newRows = autoSetUsageStatus(
      newRowCount,
      Number(currentInfo.tenantCount) || 0,
      currentInfo.leaseRows,
      status,
      isCommercial
    );

    setInfo((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        totalCount: onlyNumbers,
        leaseRows: newRows,
      },
    }));
  };

  /**
   * 총 가구/임대 수 blur 핸들러
   * 빈 값이면 1로 설정합니다.
   */
  const handleTotalCountBlur = () => {
    const currentInfo = info[status];
    const num = Number(currentInfo.totalCount);

    if (!currentInfo.totalCount || num < 1) {
      setInfo((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          totalCount: '1',
        },
      }));
    }
  };

  /**
   * 임차인 수 변경 핸들러
   * 임대/공실 행이 자동으로 재계산됩니다.
   */
  const handleTenantCountChange = (value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    const newTenantCount = Number(onlyNumbers) || 0;
    const currentInfo = info[status];

    const newRows = autoSetUsageStatus(
      Number(currentInfo.totalCount) || 0,
      newTenantCount,
      currentInfo.leaseRows,
      status,
      isCommercial
    );

    setInfo((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        tenantCount: onlyNumbers,
        leaseRows: newRows,
      },
    }));
  };

  /**
   * 임차인 수 blur 핸들러
   * 빈 값이면 0으로 설정합니다.
   */
  const handleTenantCountBlur = () => {
    const currentInfo = info[status];

    if (!currentInfo.tenantCount) {
      setInfo((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          tenantCount: '0',
        },
      }));
    }
  };

  /**
   * 개별 행 usage 변경 핸들러
   * 이용현황 변경 시 보증금/월세 필드를 초기화합니다.
   */
  const handleRowUsageChange = (rowId: string, newUsage: string) => {
    setInfo((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        leaseRows: prev[status].leaseRows.map((r) => (r.id === rowId
          ? {
            ...r,
            usage: newUsage,
            // 임대가 아니면 보증금/월세 초기화
            deposit: newUsage === '임대' ? r.deposit : '',
            rent: newUsage === '임대' ? r.rent : '',
          }
          : r)),
      },
    }));
  };

  /**
   * 개별 행 보증금 변경 핸들러
   */
  const handleRowDepositChange = (rowId: string, value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '');

    setInfo((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        leaseRows: prev[status].leaseRows.map((r) =>
          r.id === rowId ? { ...r, deposit: onlyNumbers } : r
        ),
      },
    }));
  };

  /**
   * 개별 행 월세 변경 핸들러
   */
  const handleRowRentChange = (rowId: string, value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '');

    setInfo((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        leaseRows: prev[status].leaseRows.map((r) =>
          r.id === rowId ? { ...r, rent: onlyNumbers } : r
        ),
      },
    }));
  };

  /**
   * 개별 행 사업자등록 여부 변경 핸들러 (상업용 전용)
   */
  const handleRowBusinessRegistrationChange = (rowId: string, value: string) => {
    setInfo((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        leaseRows: prev[status].leaseRows.map((r) =>
          r.id === rowId ? { ...r, businessRegistration: value } : r
        ),
      },
    }));
  };

  return {
    /** 현재 점유 상태 */
    status,
    /** 점유 상태별 정보 (totalCount, tenantCount, leaseRows) */
    info,
    /** 상업용 여부 */
    isCommercial,
    /** 점유 상태 변경 */
    handleStatusChange,
    /** 총 가구/임대 수 변경 */
    handleTotalCountChange,
    /** 총 가구/임대 수 blur */
    handleTotalCountBlur,
    /** 임차인 수 변경 */
    handleTenantCountChange,
    /** 임차인 수 blur */
    handleTenantCountBlur,
    /** 개별 행 이용현황 변경 */
    handleRowUsageChange,
    /** 개별 행 보증금 변경 */
    handleRowDepositChange,
    /** 개별 행 월세 변경 */
    handleRowRentChange,
    /** 개별 행 사업자등록 변경 (상업용) */
    handleRowBusinessRegistrationChange,
  };
};
