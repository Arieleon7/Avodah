import type { Metadata } from 'next';
import './globals.css';
import './resource-library.css';
import './editor-dialogs.css';
import './mobile.css';
import './production-media.css';

export const metadata: Metadata = {
  title: 'AVODAH — Production Workspace',
  description: 'Donde las ideas se convierten en programas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
