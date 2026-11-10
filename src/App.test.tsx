import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './state';

describe('카페인 타이머', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows Korean one-tap presets above the time field, with settings and capsules collapsed', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '카페인 타이머' })).toBeInTheDocument();
    expect(screen.getByText(/용량은 참고값입니다/)).toBeInTheDocument();
    expect(screen.getByText(/교육용 추정치이며 의학적 조언이 아닙니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /아메리카노 톨 150 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /아메리카노 그란데 225 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /에스프레소 1샷 75 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /콜드브루 200 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /카페라테 150 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /에너지드링크 80 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /녹차 30 mg/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직접 입력' })).toBeInTheDocument();
    expect(screen.queryByLabelText('취침 시각')).not.toBeInTheDocument();
    expect(screen.getByLabelText('시각')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /시간에 따른 카페인 농도/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /공유|Reset|시나리오 2|Scenario 2/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('회사')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('체중')).not.toBeInTheDocument();

    const preset = screen.getByRole('button', { name: /아메리카노 톨/ });
    const time = screen.getByLabelText('시각');
    expect(preset.compareDocumentPosition(time) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('records a preset with one tap and removes it from the list', async () => {
    render(<App />);

    expect(screen.getByRole('article', { name: '현재 체내 농도' })).toHaveTextContent('기록 없음');
    fireEvent.click(screen.getByRole('button', { name: /아메리카노 톨 150 mg/ }));

    const list = screen.getByRole('list', { name: '오늘 기록' });
    expect(list).toHaveTextContent('아메리카노 톨');
    expect(list).toHaveTextContent('150 mg');
    expect(screen.getByRole('article', { name: '현재 체내 농도' })).toHaveTextContent(/mg\/L/);
    expect(screen.getByRole('article', { name: '참고선 아래' })).not.toHaveTextContent('기록 없음');
    expect(screen.getByRole('article', { name: '취침 판정' })).toHaveTextContent(/취침 23:00이면 (여유 있음|주의)/);
    expect(screen.getByRole('img', { name: /섭취 표시 아메리카노 톨/ })).toBeInTheDocument();

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('아메리카노 톨'));

    fireEvent.click(within(list).getByRole('button', { name: '지우기' }));
    expect(screen.getByRole('list', { name: '오늘 기록' })).toHaveTextContent('아직 기록이 없습니다');
    expect(screen.getByRole('article', { name: '현재 체내 농도' })).toHaveTextContent('기록 없음');
  });

  it('shifts the selected time by the quick buttons before recording', () => {
    render(<App />);

    const time = screen.getByLabelText('시각') as HTMLInputElement;
    const before = new Date(time.value).getTime();
    fireEvent.click(screen.getByRole('button', { name: '−15분' }));
    const after = new Date((screen.getByLabelText('시각') as HTMLInputElement).value).getTime();

    expect(after - before).toBe(-15 * 60_000);
    fireEvent.click(screen.getByRole('button', { name: /에스프레소 1샷/ }));
    expect(screen.getByRole('list', { name: '오늘 기록' })).toHaveTextContent('에스프레소 1샷');
    expect(screen.getByRole('list', { name: '오늘 기록' })).toHaveTextContent('75 mg');
  });

  it('adds a custom dose only after a positive amount is entered', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '직접 입력' }));
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(screen.getByRole('status')).toHaveTextContent(/카페인 mg/);
    expect(screen.getByRole('list', { name: '오늘 기록' })).toHaveTextContent('아직 기록이 없습니다');

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '집 커피' } });
    fireEvent.change(screen.getByLabelText(/카페인 \(mg\)/), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByRole('list', { name: '오늘 기록' })).toHaveTextContent('집 커피');
    expect(screen.getByRole('list', { name: '오늘 기록' })).toHaveTextContent('90 mg');
  });

  it('keeps profile defaults in 설정 and rejects an out-of-range weight without dropping the graph', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '설정' }));
    const weight = screen.getByLabelText('체중');
    expect(weight).toHaveValue('70');
    expect(screen.getByLabelText('민감도')).toHaveValue('typical');
    expect(screen.getByLabelText('흡연')).toHaveValue('non-smoker');
    expect(screen.getByLabelText('임신·산후')).toHaveValue('not-pregnant');
    expect(screen.getByLabelText('취침 시각')).toHaveValue('23:00');
    expect(screen.getByLabelText('참고선')).toHaveValue(0.7);

    fireEvent.change(weight, { target: { value: '62' } });
    fireEvent.blur(weight);
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('"weightKg":62'));

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '설정' }));
    expect(screen.getByLabelText('체중')).toHaveValue('62');

    fireEvent.change(screen.getByLabelText('체중'), { target: { value: '251' } });
    fireEvent.blur(screen.getByLabelText('체중'));
    expect(screen.getByRole('status')).toHaveTextContent(/25–250 kg/);
    expect(screen.getByLabelText('체중')).toHaveValue('62');
    expect(screen.getByRole('img', { name: /시간에 따른 카페인 농도/ })).toBeInTheDocument();
  });

  it('adds a curated capsule from the collapsed Korean picker', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '캡슐 더보기' }));
    fireEvent.change(screen.getByLabelText('회사'), { target: { value: 'Nespresso' } });
    fireEvent.change(screen.getByLabelText('캡슐 시스템'), { target: { value: 'Original' } });
    fireEvent.change(screen.getByLabelText('제품 검색'), { target: { value: '디카페인' } });

    await waitFor(() => expect(screen.getByLabelText('제품')).toHaveTextContent(/Decaffeinato/));
    fireEvent.click(screen.getByRole('button', { name: '이 캡슐 추가' }));

    const list = screen.getByRole('list', { name: '오늘 기록' });
    expect(list).toHaveTextContent(/Decaffeinato|Volluto|Ristretto/);
    expect(list).toHaveTextContent('mg');
    expect(screen.queryByText(/Scenario 1/)).not.toBeInTheDocument();
  });
});
