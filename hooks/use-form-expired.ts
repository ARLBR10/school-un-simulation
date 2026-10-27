import { useEffect, useState } from "react";

import { isFormExpired, type FormDefinition } from "@/lib/forms";

export function useFormExpired(definition: FormDefinition) {
  const { expiresAt } = definition;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expiresAt === undefined) return;
    let timeout: ReturnType<typeof setTimeout>;
    function refresh() {
      const currentTime = Date.now();
      setNow(currentTime);
      if (expiresAt !== undefined && currentTime < expiresAt) {
        timeout = setTimeout(refresh, Math.min(expiresAt - currentTime, 86_400_000));
      }
    }
    refresh();
    return () => clearTimeout(timeout);
  }, [expiresAt]);

  return isFormExpired(definition, now);
}
