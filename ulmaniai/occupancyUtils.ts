/**
 * 점유 상태 관련 유틸리티 함수
 *
 * 매물의 점유 상태(거주/임대/거주+임대)에 따라
 * 동적으로 테이블 행을 생성하는 로직을 담당합니다.
 */

/** 점유 상태 타입 */
export type OccupancyStatus = 'residence' | 'rent' | 'both' | 'self-use';

/** 임대 행 데이터 타입 */
export type LeaseRow = {
  id: string;
  usage: string;
  deposit: string;
  rent: string;
  businessRegistration?: string;
};

/** 섹션 정보 타입 */
export type SectionInfo = {
  totalCount: string;
  tenantCount: string;
  leaseRows: LeaseRow[];
};

/**
 * 점유 상태에 따라 임대 행을 자동으로 설정합니다.
 *
 * @param totalCount - 총 가구/임대 수
 * @param tenantCount - 임차인 수
 * @param existingRows - 기존 행 데이터
 * @param status - 점유 상태 ('residence' | 'rent' | 'both' | 'self-use')
 * @param isCommercial - 상가 여부 (기본값: false)
 * @returns 새로운 LeaseRow 배열
 *
 * @example
 * // 거주 중 상태 - 모든 행이 '거주 중'으로 설정
 * autoSetUsageStatus(3, 0, [], 'residence', false);
 * // => [{ id: '1', usage: '거주 중', ... }, ...]
 *
 * @example
 * // 임대 중 상태 - 임차인 수만큼 '임대', 나머지는 '공실'
 * autoSetUsageStatus(3, 2, [], 'rent', false);
 * // => [{ usage: '임대' }, { usage: '임대' }, { usage: '공실' }]
 *
 * @example
 * // 거주 + 임대 상태 - 마지막 행은 '거주', 나머지는 임대/공실
 * autoSetUsageStatus(3, 1, [], 'both', false);
 * // => [{ usage: '임대' }, { usage: '공실' }, { usage: '거주' }]
 */
export const autoSetUsageStatus = (
  totalCount: number,
  tenantCount: number,
  existingRows: LeaseRow[],
  status: OccupancyStatus,
  isCommercial: boolean = false
): LeaseRow[] => {
  // 'residence' 또는 'self-use' 상태
  // 모든 행을 거주/직접사용으로 설정
  if (status === 'residence' || status === 'self-use') {
    const rowCount = Math.max(totalCount, tenantCount, 1);
    const newRows: LeaseRow[] = [];

    for (let i = 0; i < rowCount; i += 1) {
      const usage = isCommercial ? '직접사용' : '거주 중';
      newRows.push({
        id: String(i + 1),
        usage,
        deposit: '',
        rent: '',
        ...(isCommercial && { businessRegistration: '' }),
      });
    }

    return newRows;
  }

  // 'rent' 상태
  // 임차인 수만큼 '임대', 나머지는 '공실'
  if (status === 'rent') {
    const rowCount = Math.max(totalCount, tenantCount, 1);
    const newRows: LeaseRow[] = [];

    for (let i = 0; i < rowCount; i += 1) {
      const existingRow = existingRows[i];
      const usage = i < tenantCount ? '임대' : '공실';

      newRows.push({
        id: String(i + 1),
        usage,
        // 기존 데이터 유지 (임대인 경우만)
        deposit: usage === '임대' ? (existingRow?.deposit || '') : '',
        rent: usage === '임대' ? (existingRow?.rent || '') : '',
      });
    }

    return newRows;
  }

  // 'both' 상태 (거주 + 임대)
  // 마지막 행은 거주/직접사용, 나머지는 임대/공실
  if (status === 'both') {
    const availableCount = totalCount - 1; // 거주용 1개 제외
    const rentCount = Math.max(availableCount, tenantCount);
    const newRows: LeaseRow[] = [];

    // 임대/공실 행 생성
    for (let i = 0; i < rentCount; i += 1) {
      const existingRow = existingRows[i];
      const usage = i < tenantCount ? '임대' : '공실';

      newRows.push({
        id: String(i + 1),
        usage,
        deposit: usage === '임대' ? (existingRow?.deposit || '') : '',
        rent: usage === '임대' ? (existingRow?.rent || '') : '',
        ...(isCommercial && { businessRegistration: existingRow?.businessRegistration || '' }),
      });
    }

    // 거주/직접사용 행 추가 (마지막)
    newRows.push({
      id: String(rentCount + 1),
      usage: isCommercial ? '직접사용' : '거주',
      deposit: '',
      rent: '',
      ...(isCommercial && { businessRegistration: '' }),
    });

    return newRows;
  }

  // 알 수 없는 상태인 경우 기존 행 유지
  return existingRows;
};
