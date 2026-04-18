// Renders a single schema.org JSON-LD document as an inline
// `<script type="application/ld+json">` tag. React 19 treats a string
// child of `<script>` as raw script text (no HTML escaping), which is
// what JSON-LD parsers require — any HTML escaping on `<`/`&` would
// break `JSON.parse`. The `<` characters that JSON.stringify can emit
// come from embedded string values (e.g. a product description);
// replacing them with the `\u003c` escape keeps the JSON valid and
// prevents a `</script>` substring inside a field from prematurely
// closing the tag.

export type JsonLdProps = {
  schema: unknown;
  id?: string;
};

export function JsonLd({ schema, id }: JsonLdProps) {
  const body = JSON.stringify(schema).replace(/</g, "\\u003c");
  return (
    <script id={id} type="application/ld+json">
      {body}
    </script>
  );
}
