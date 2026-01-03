import { Suspense } from 'react';
import FAQClient from './faq-client';

export default function FAQPage(): React.ReactElement {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FAQClient />
    </Suspense>
  );
}