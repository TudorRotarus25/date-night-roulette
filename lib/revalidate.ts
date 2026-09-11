import { revalidatePath } from "next/cache";

/**
 * Every route that renders a Restaurant. Kept in one place so the intake
 * endpoint and the server actions can't drift apart.
 */
export function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/restaurants");
  revalidatePath("/benched");
}
