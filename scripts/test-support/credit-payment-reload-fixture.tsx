import { createRoot } from 'react-dom/client';
import { PaymentForm } from '@/app/(protected)/dashboard/finanzas/payments/components/payment-form';

createRoot(document.getElementById('root')!).render(<PaymentForm embedded />);
