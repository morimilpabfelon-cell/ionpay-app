import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const SendIcon = (props: IconProps) => <svg {...base} {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
export const ReceiveIcon = (props: IconProps) => <svg {...base} {...props}><path d="M12 3v13"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>
export const PayIcon = (props: IconProps) => <svg {...base} {...props}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M7 15h3"/></svg>
export const ConvertIcon = (props: IconProps) => <svg {...base} {...props}><path d="m17 3 4 4-4 4"/><path d="M3 7h18"/><path d="m7 21-4-4 4-4"/><path d="M21 17H3"/></svg>
export const HomeIcon = (props: IconProps) => <svg {...base} {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
export const ActivityIcon = (props: IconProps) => <svg {...base} {...props}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
export const CardIcon = (props: IconProps) => <svg {...base} {...props}><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/></svg>
export const UserIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
export const BellIcon = (props: IconProps) => <svg {...base} {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
export const EyeIcon = (props: IconProps) => <svg {...base} {...props}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12"/><circle cx="12" cy="12" r="2.5"/></svg>
export const EyeOffIcon = (props: IconProps) => <svg {...base} {...props}><path d="m3 3 18 18"/><path d="M10.6 6.2A11.8 11.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.2 3"/><path d="M6.5 6.5C3.6 8.3 2 12 2 12s3.5 6 10 6a10 10 0 0 0 4-.8"/></svg>
export const ArrowUpIcon = (props: IconProps) => <svg {...base} {...props}><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>
export const ArrowDownIcon = (props: IconProps) => <svg {...base} {...props}><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></svg>
export const SearchIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
export const ChevronIcon = (props: IconProps) => <svg {...base} {...props}><path d="m9 18 6-6-6-6"/></svg>
export const CloseIcon = (props: IconProps) => <svg {...base} {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>
export const CheckIcon = (props: IconProps) => <svg {...base} {...props}><path d="m5 12 4 4L19 6"/></svg>
export const ShieldIcon = (props: IconProps) => <svg {...base} {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
export const CopyIcon = (props: IconProps) => <svg {...base} {...props}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
export const MoreIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>
export const GridIcon = (props: IconProps) => <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
export const QrIcon = (props: IconProps) => <svg {...base} {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/></svg>
export const CodeIcon = (props: IconProps) => <svg {...base} {...props}><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/></svg>
export const LinkIcon = (props: IconProps) => <svg {...base} {...props}><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>
export const TouchIcon = (props: IconProps) => <svg {...base} {...props}><path d="M8 11V7a2 2 0 0 1 4 0v4"/><path d="M12 10V6a2 2 0 0 1 4 0v6"/><path d="M16 10a2 2 0 0 1 4 0v4c0 5-3 8-8 8h-1c-3 0-5-2-7-5l-1-2a2 2 0 0 1 3-2l2 2v-4"/></svg>
export const StoreIcon = (props: IconProps) => <svg {...base} {...props}><path d="M3 9 5 3h14l2 6"/><path d="M5 13v8h14v-8"/><path d="M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>
export const LimitIcon = (props: IconProps) => <svg {...base} {...props}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/><path d="M2 19h22"/></svg>
export const GuideIcon = (props: IconProps) => <svg {...base} {...props}><path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z"/><path d="M4 5v17M9 7h7M9 11h7"/></svg>
export const ExchangeIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="m8 9 2-2 2 2M10 7v7M16 15l-2 2-2-2M14 17v-7"/></svg>
export const CheckoutIcon = (props: IconProps) => <svg {...base} {...props}><path d="M3 4h2l2.3 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>
export const PayoutIcon = (props: IconProps) => <svg {...base} {...props}><path d="M12 2v13M7 10l5 5 5-5"/><path d="M4 19h16v3H4z"/></svg>
export const GatewayIcon = (props: IconProps) => <svg {...base} {...props}><path d="M4 21V7l8-4 8 4v14"/><path d="M8 21v-5h8v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01"/></svg>
export const LockIcon = (props: IconProps) => <svg {...base} {...props}><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/></svg>
export const SettingsIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
export const PhoneIcon = (props: IconProps) => <svg {...base} {...props}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/></svg>
export const GlobeIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
export const BankIcon = (props: IconProps) => <svg {...base} {...props}><path d="m3 9 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M2 18h20"/></svg>
export const DeviceIcon = (props: IconProps) => <svg {...base} {...props}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>
export const KeyIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M15 8l3 3M17 6l2 2"/></svg>
export const UsersIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 6"/></svg>
export const HelpIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 3.7 2.2c-1 .6-1.5 1-1.5 2.3M12 17h.01"/></svg>
export const LogoutIcon = (props: IconProps) => <svg {...base} {...props}><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>
export const LaptopIcon = (props: IconProps) => <svg {...base} {...props}><rect x="4" y="3" width="16" height="12" rx="2"/><path d="M2 19h20M8 19l1-4h6l1 4"/></svg>
export const LocationIcon = (props: IconProps) => <svg {...base} {...props}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
