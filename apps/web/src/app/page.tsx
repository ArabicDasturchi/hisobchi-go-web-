import { redirect } from 'next/navigation';

// Kirgan foydalanuvchi — dashboard; kirmagan — proxy /login ga yo'naltiradi
export default function Home() {
  redirect('/dashboard');
}
