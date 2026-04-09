export * from './photo';
export * from './common';
export * from './mapMarker';

import { SVGProps } from 'react';

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};
