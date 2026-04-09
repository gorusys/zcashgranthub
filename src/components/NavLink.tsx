import { forwardRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, href, ...props }, ref) => {
    const router = useRouter();
    const hrefString = typeof href === "string" ? href : "";
    const isActive = hrefString ? router.pathname === hrefString : false;
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName, pendingClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
