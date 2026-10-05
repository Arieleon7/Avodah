import type { Metadata, Viewport } from 'next';
import './globals.css';
import './resource-library.css';
import './editor-dialogs.css';
import './mobile.css';
import './production-media.css';
import './quick-chat.css';
import './brand-system.css';
import './product-polish.css';
import './art-direction.css';
import './script-board.css';
import './script-document.css';
import './multimedia-library.css';
import './notes-editor.css';
import './production-notes.css';
import './block-preview.css';
import './responsive-final.css';
import './push-notifications.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F8F5EE',
};

export const metadata: Metadata = {
  title: 'AVODAH — Donde las ideas se convierten en programas',
  description: 'Donde las ideas se convierten en programas.',
  applicationName: 'AVODAH',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'AVODAH' },
  icons: { icon: '/brand/avodah-icon.svg', apple: '/brand/avodah-icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
