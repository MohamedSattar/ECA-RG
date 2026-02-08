import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="border-t bg-white border-color-orange">
      <div className="container py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} ECA. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a
            className="hover:text-foreground"
            href="https://eca.gov.ae/terms-conditions/"
            target="_blank"
          >
            Terms
          </a>
          <a
            className="hover:text-foreground"
            href="https://eca.gov.ae/privacy-policy/"
            target="_blank"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
