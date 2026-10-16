import { Modal } from '@thesispartner/ui';
import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useT } from '../../../i18n/LocaleContext';
import { useCreateRemark } from '../hooks/use-remarks';
import { RemarkForm } from './RemarkForm';

export function LinkedRemarkButton({
  thesisId,
  subject,
  objectiveId = null,
  deliverableId = null,
}: {
  thesisId: string;
  subject: string;
  objectiveId?: string | null;
  deliverableId?: string | null;
}) {
  const t = useT();
  const create = useCreateRemark(thesisId);
  const [open, setOpen] = useState(false);
  const label = `${t('remarks.new')} ${subject}`;

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-brand hover:bg-brand-soft"
        onClick={() => setOpen(true)}
      >
        <Icon name="remarks" className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        title={t('remarks.new')}
        closeLabel={t('common.close')}
        onClose={() => setOpen(false)}
      >
        <RemarkForm
          objectives={[]}
          deliverables={[]}
          pending={create.isPending}
          error={create.error}
          fixed={{ objectiveId, deliverableId, label: subject }}
          onCancel={() => setOpen(false)}
          onSubmit={async (body) => {
            await create.mutateAsync(body);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
