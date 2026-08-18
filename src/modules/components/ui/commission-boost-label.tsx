import { BASE_PATH } from '@/lib/publicPath';
import { imgSrc } from '@/lib/imgSrc';
import { cn } from './utils';

/**
 * Promo label on affiliate listings when commission multiplier is on.
 * Swap `COMMISSION_BOOST_LABEL_SRC` when the designed artwork is ready.
 */
// const COMMISSION_BOOST_LABEL_SRC: string | null = null;

const COMMISSION_BOOST_LABEL_SRC = 'comm_boost_label_bg.png';
type CommissionBoostLabelProps = {
  factor?: number;
  className?: string;
};

export function CommissionBoostLabel({ factor = 2, className }: CommissionBoostLabelProps) {
  const factorLabel = Number.isInteger(factor) ? String(factor) : String(factor);
  const alt = `คูณ ${factorLabel} ค่าแนะนำ`;

  if (COMMISSION_BOOST_LABEL_SRC) {
    const src = COMMISSION_BOOST_LABEL_SRC.startsWith('http')
      ? COMMISSION_BOOST_LABEL_SRC
      : `${BASE_PATH}${COMMISSION_BOOST_LABEL_SRC.startsWith('/') ? '' : '/'}${COMMISSION_BOOST_LABEL_SRC}`;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <div className='w-32 h-9 bg-contain bg-left bg-no-repeat relative' style={{ backgroundImage: `url(${imgSrc(src)})` }}>
        <span className="text-[16px] text-white font-bold leading-none tracking-wide absolute top-[10px] right-[16px] pulse-effect">x{factorLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'commission-boost-label inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-accent-foreground shadow-sm',
        className,
      )}
      aria-label={alt}
    >
      <span className="text-[11px] font-semibold leading-none tracking-wide">x{factorLabel}</span>
    </div>
  );
}
