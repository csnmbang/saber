import { SetReader } from '@/components/SetReader';
import { dbConfigured } from '@/lib/db';

export default function Home() {
  // Saving is only offered where there is somewhere to save to, so the page
  // works exactly as before on a deployment with no database behind it.
  return <SetReader canSave={dbConfigured()} />;
}
