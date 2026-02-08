import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/state/auth";
import { ContactFields, TableName } from "@/constants";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Badge } from "@/ui/badge";
import { Bell, ChevronDown } from "lucide-react";
import { useDataverseApi } from "@/hooks/useDataverseApi";

export function SiteHeader() {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, login, logout, isAuthed, isLoading } = useAuth();
  const navigate = useNavigate();
  const { callApi } = useDataverseApi();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname, location.hash]);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    const fetchNotifications = async () => {
      if (isAuthed && user) {
        try {
          // Get current user's contact ID
          const currentUserContactId = user?.contact?.[ContactFields.CONTACTID];

          if (!currentUserContactId) {
            console.error("No contact ID found for current user");
            return;
          }

          // Build URL with filter for _prmtk_applicant_value
          const url = `/_api/${TableName.NOTIFICATIONS}?$filter=_prmtk_applicant_value eq ${currentUserContactId}&$orderby=createdon desc`;
          const response = await callApi<{ value: any[] }>({
            method: "GET",
            url,
          });

          const apiNotifications = response?.value || [];

          // Filter unread notifications (prmtk_seen is null or false)
          const unreadNotifications = apiNotifications.filter(
            (item: any) => item.prmtk_seen !== true,
          );

          setUnreadCount(unreadNotifications.length);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      }
    };

    fetchNotifications();

    // Refresh notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, [isAuthed, user]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-transparent bg-[#1D2054]">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/images/ECALogo.png"
            alt="ECA logo"
            className="h-8 w-auto"
          />
          <span className="font-semibold tracking-tight text-white">
            {t("header.title")}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {useAuth().isAuthed && (
            <>
              <Link
                to="/"
                className="text-white/80 hover:text-white transition-colors"
              >
                {t("header.home")}
              </Link>
              <Link
                to="/applications"
                className="text-white/80 hover:text-white transition-colors"
              >
                {t("header.applications")}
              </Link>
              <Link
                to="/researches"
                className="text-white/80 hover:text-white transition-colors"
              >
                {t("header.researches")}
              </Link>
              {/* <Link to="/grantdetail" className="text-white/80 hover:text-white transition-colors">{t('header.grants')}</Link>
              <Link to="/#about" className="text-white/80 hover:text-white transition-colors">{t('header.about')}</Link> */}
            </>
          )}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {!isAuthed && (
            <button
              disabled={isLoading}
              onClick={async () => {
                try {
                  await login();
                } catch (error) {
                  console.error("Login failed:", error);
                }
              }}
              className={`inline-flex items-center rounded-md border border-white/40 px-4 py-1.5 text-sm font-medium text-white transition-colors ${
                isLoading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {isLoading ? "Authenticating..." : t("header.login")}
            </button>
          )}
          {isAuthed && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 outline-none p-1 rounded-sm border border-[#FFFFFF4B]">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-white/20">
                      <AvatarImage
                        src="/images/avatar-placeholder.png"
                        alt={user?.contact?.[ContactFields.FULLNAME]}
                      />
                      <AvatarFallback className="bg-blue-500 text-white">
                        {user?.contact?.[ContactFields.FULLNAME]
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase() || user?.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#E26E50] flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white font-medium text-sm leading-tight">
                      {user?.contact?.[ContactFields.FULLNAME] || user?.email}
                    </span>
                    <span className="text-white/70 text-xs leading-tight">
                      {user?.email || "User"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/notifications")}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{t("header.notifications")}</span>
                      {unreadCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-[#E26E50] text-white"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/updateprofile")}
                  >
                    {t("header.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => logout()}
                  >
                    {t("header.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
