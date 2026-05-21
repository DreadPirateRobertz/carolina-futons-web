import { listProductQa } from "@/lib/wix/product-qa";
import type { QaItem } from "@/lib/qa/qa-schema";
import { logError } from "@/lib/observability/log";
import { CustomerQaForm } from "@/components/product/CustomerQaForm";

function QaEntry({ item }: { item: QaItem }) {
  const askedDate = new Date(item.askedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div data-testid="qa-item" className="py-5 last:pb-0">
      <p className="text-sm font-medium text-cf-ink">{item.question}</p>
      <p className="mt-0.5 text-xs text-cf-muted">
        Asked by {item.askedBy} · {askedDate}
      </p>
      {item.answer ? (
        <div className="mt-3 rounded-md bg-cf-sand/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-cf-muted">
            Answer
          </p>
          <p className="mt-1 text-sm text-cf-ink">{item.answer}</p>
          {item.answeredBy ? (
            <p className="mt-1 text-xs text-cf-muted">— {item.answeredBy}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs italic text-cf-muted">
          Waiting for an answer from our team.
        </p>
      )}
    </div>
  );
}

type Props = { productSlug: string };

export async function CustomerQa({ productSlug }: Props) {
  let items: QaItem[] = [];
  let loadFailed = false;
  try {
    items = await listProductQa(productSlug);
  } catch (err) {
    logError("customer-qa", "listProductQa failed — showing error state", err);
    loadFailed = true;
  }

  return (
    <section
      data-slot="customer-qa"
      data-testid="customer-qa"
      className="mt-16 max-w-3xl border-t border-cf-divider pt-10"
    >
      <h2 className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink">
        Customer Questions &amp; Answers
      </h2>

      {loadFailed ? (
        <p
          className="mt-4 text-sm text-cf-muted"
          data-testid="qa-load-error"
        >
          Questions are temporarily unavailable. Please try again later.
        </p>
      ) : items.length === 0 ? (
        <p
          className="mt-4 text-sm text-cf-muted"
          data-testid="qa-empty-state"
        >
          Be the first to ask a question about this product.
        </p>
      ) : (
        <div
          className="mt-6 divide-y divide-cf-divider"
          data-testid="qa-list"
        >
          {items.map((item) => (
            <QaEntry key={item._id} item={item} />
          ))}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-base font-semibold text-cf-ink">Ask a question</h3>
        <p className="mt-1 text-sm text-cf-muted">
          Your name is shown only as initials. Answers are posted publicly so
          everyone benefits.
        </p>
        <div className="mt-4">
          <CustomerQaForm productSlug={productSlug} />
        </div>
      </div>
    </section>
  );
}
