import { useEffect, useState } from "react";
import Reveal from "@/motion/Reveal";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Loader, OverlayLoader } from "@/components/Loader";
import { Mail, CheckCheck, Trash2 } from "lucide-react";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { TableName, ContactKeys } from "@/constants";
import { useAuth } from "@/state/auth";

interface Notification {
  id: string;
  date: string;
  title: string;
  description: string;
  isRead: boolean;
  link?: string;
}

export default function Notifications() {
  const { callApi } = useDataverseApi();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [markingAllRead, setMarkingAllRead] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        // Get current user's contact ID
        const currentUserContactId = user?.contact?.[ContactKeys.CONTACTID];

        if (!currentUserContactId) {
          console.error("No contact ID found for current user");
          setNotifications([]);
          setLoading(false);
          return;
        }

        // Build URL with filter for _prmtk_applicant_value
        const url = `/_api/${TableName.NOTIFICATIONS}?$filter=_prmtk_applicant_value eq ${currentUserContactId}&$orderby=createdon desc`;

        const response = await callApi<{ value: any[] }>({
          url,
          method: "GET",
        });

        console.log("Notifications API Response:", response);

        // Map the API response
        const apiNotifications = response?.value || [];

        const mappedNotifications = apiNotifications.map((item: any) => {
          // Format date to "Oct 10, 2025" without time
          let formattedDate = "";
          try {
            const dateObj = new Date(item.createdon);
            const options: Intl.DateTimeFormatOptions = {
              year: "numeric",
              month: "short",
              day: "numeric",
            };
            formattedDate = dateObj.toLocaleDateString("en-US", options);
          } catch {
            formattedDate =
              item["createdon@OData.Community.Display.V1.FormattedValue"] || "";
          }

          return {
            id: item.prmtk_notificationid,
            title: item.prmtk_header || "Notification",
            description: item.prmtk_body || "",
            date: formattedDate,
            isRead: item.prmtk_seen === true,
            link: item.prmtk_link,
            ownerId: item._ownerid_value, // Keep for debugging
          };
        });

        console.log(
          "Filtered Notifications Count:",
          mappedNotifications.length,
        );

        setNotifications(mappedNotifications);
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleReadAll = async () => {
    // Get only unread notifications
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    
    if (unreadNotifications.length === 0) {
      return; // Nothing to update
    }
    
    setMarkingAllRead(true);
    
    try {
      // Update all unread notifications in parallel
      await Promise.all(
        unreadNotifications.map(async (notification) => {
          const url = `/_api/${TableName.NOTIFICATIONS}(${notification.id})`;
          return callApi({
            url,
            method: "PATCH",
            data: {
              prmtk_seen: true,
            },
          });
        })
      );
      
      // Update local state - mark all as read
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };



  const handleMarkAsRead = async (id: string) => {
    // Find the notification
    setLoading(true);
    const notification = notifications.find((n) => n.id === id);
    
    // Only update if it's unread
    if (!notification || notification.isRead) {
      return;
    }
    
    try {
      // Update the notification in Dataverse
      const url = `/_api/${TableName.NOTIFICATIONS}(${id})`;
      await callApi({
        url,
        method: "PATCH",
        data:{
            prmtk_seen: true,
        }
      });
      
      // Update local state
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };


  return (
    <>
      {/* Overlay loader for marking all as read */}
      <Loader isVisible={markingAllRead || loading} />

      <section className="relative overflow-hidden bg-[#1D2054]">
        <Reveal>
          <div className="container py-4 md:py-4 grid gap-10 md:grid-cols-2 items-center">
            <div className="max-w-2xl flex flex-col gap-4">
              <h1 className="text-2xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                Notifications
              </h1>
            </div>

            {/* Hero Collage */}
            <div className="relative flex justify-center md:justify-end">

              <img
                src="/images/notfication.png"
                alt="Notifications Illustration"
                className="h-auto w-auto max-w-none"
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Page Content */}
      <section className="bg-white min-h-screen">
        <div className="container py-8 md:py-12">
          {/* Header with actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                ({unreadCount}) New Notifications
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReadAll}
                disabled={markingAllRead || unreadCount === 0}
                className="text-sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                {markingAllRead ? "Marking..." : "Read All"}
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No notifications to display</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md border-[#F3D1BF] ${
                    notification.isRead
                      ? "bg-white border-gray-200"
                      : "bg-[#FAE7DD] "
                  }`}
                >
                    
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="flex items-center justify-center gap-2 text-center">
                        <span className="text-sm text-gray-600">
                          {notification.date}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2 text-center">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 text-center">
                        {notification.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-10">
                      {!notification.isRead ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="shrink-0 h-8 w-8"
                          title="Mark as read"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="h-8 w-8" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
