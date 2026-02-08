interface WorkflowItem {
  prmtk_stagename: string;
  prmtk_name: string;
  prmtk_message?: string;
  createdon: string;
  _createdby_value?: string;
  _owningbusinessunit_value?: string;
  "createdon@OData.Community.Display.V1.FormattedValue"?: string;
  "_createdby_value@OData.Community.Display.V1.FormattedValue"?: string;
  "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue"?: string;
}

interface WorkflowTimelineProps {
  workflowData: WorkflowItem[];
  applicationNumber: string;
  currentStatus: string;
  username: string;
}

// Function to determine color based on stage/status
const getStatusColor = (stageName: string): string => {
  const stage = stageName?.toLowerCase() || "";

  if (stage.includes("draft")) return "bg-gray-400";
  if (stage.includes("submit") || stage.includes("received"))
    return "bg-blue-400";
  if (stage.includes("review") || stage.includes("under review"))
    return "bg-blue-500";
  if (stage.includes("revision") || stage.includes("request"))
    return "bg-yellow-500";
  if (stage.includes("reject") || stage.includes("declined"))
    return "bg-red-400";
  if (stage.includes("approve") || stage.includes("accepted"))
    return "bg-green-400";
  if (stage.includes("complete")) return "bg-green-500";

  return "bg-blue-400"; // default
};

// Function to format date
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateString;
  }
};

export default function WorkflowTimeline({
  workflowData,
  applicationNumber,
  currentStatus,
  username,
}: WorkflowTimelineProps) {
  // If no data, show empty state
  if (!workflowData || workflowData.length === 0) {
    return (
      <div className="bg-[#FFF9F5] border border-orange-200 rounded-xl p-6 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-800">
            Application Number: {applicationNumber || "N/A"}
          </h2>
          <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-md text-sm font-semibold">
            {currentStatus || "UNKNOWN"}
          </span>
        </div>
        <div className="text-center py-8 text-gray-500">
          No history available for this application.
        </div>
      </div>
    );
  }

  const items = workflowData.map((item) => {
    let by =
      item["_createdby_value@OData.Community.Display.V1.FormattedValue"] ||
      item[
        "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue"
      ] ||
      username ||
      "System";

    // Replace # with username if present
    if (by.includes("#")) {
      by = username || "System";
    }

    return {
      status: item.prmtk_stagename || item.prmtk_name || "Status Update",
      by,
      date:
        item["createdon@OData.Community.Display.V1.FormattedValue"] ||
        formatDate(item.createdon) ||
        "Date not available",
      color: getStatusColor(item.prmtk_stagename || item.prmtk_name || ""),
      text: item.prmtk_message || "",
    };
  });

  return (
    <div className="bg-[#FFF9F5] border border-orange-200 rounded-xl p-6 w-full max-w-5xl mx-auto">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-gray-800">
          Application Number: {applicationNumber || "N/A"}
        </h2>

        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-md text-sm font-semibold">
            {currentStatus || "UNKNOWN"}
          </span>
        </div>
      </div>

      {/* ---- Timeline ---- */}
      <div className="relative pl-6 mt-4">
        {/* Vertical line */}
        <div className="absolute left-2 top-0 h-full border-l-2 border-orange-200"></div>

        <div className="space-y-10">
          {items.map((item, idx) => (
            <div key={idx} className="relative flex items-start gap-4">
              {/* Dot */}
              <div
                className={`w-3 h-3 rounded-full border-4 border-white shadow ${item.color} absolute -left-0.5 top-1`}
              />

              {/* Card */}
              <div className="bg-white border border-orange-100 rounded-lg px-5 py-4 w-full shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{item.status}</p>
                    <p className="text-gray-500 text-sm mt-0.5">by {item.by}</p>
                  </div>
                  <span className="text-gray-500 text-sm">{item.date}</span>
                </div>

                {item.text && (
                  <p className="mt-3 text-gray-600 bg-orange-50 p-3 rounded-md text-sm">
                    {item.text}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
