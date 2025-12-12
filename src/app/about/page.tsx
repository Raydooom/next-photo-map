import { title } from "@/components/primitives";

export default function AboutPage() {
  console.log(title());
  return (
    <div>
      <h1 className={title()}>About</h1>
    </div>
  );
}
