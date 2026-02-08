import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Reveal from "@/motion/Reveal";
import { useAuth } from "@/state/auth";
import { toast } from "@/ui/use-toast";
import { LookupPicker } from "@/components/LookupPicker";
import { TeamMemberSection } from "@/components/TeamMemberSection";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { TextField } from "@fluentui/react/lib/TextField";
import { DefaultButton, IconButton, PrimaryButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { BudgetCategorys, PreferredContactMethodCode } from "@/constants/options";

import {
    ApplicationKeys,
    ApplicationTeamMemberKeys,
    ContactKeys,
    ExpandRelations,
    GrantCycleKeys,
    ResearchAreaKeys,
    TableName,
    TeamMemberRoles
} from "@/constants/index";
import { ErrorDialog, SuccessDialog } from "@/components/Dialog";
import { OverlayLoader } from "@/components/Loader";
import { Icon } from "@fluentui/react/lib/Icon";
import { HEADING_TEXT } from "@/styles/constants";
import { set } from "date-fns";

export default function FormApplication() {
    const { user } = useAuth();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [showLoader, setShowLoader] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");
    const [form, setForm] = useState({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      mobilePhone: "",
      preferredMethodOfContact: 0,
      contactId: "",
      Institute: "",
    });

    const { callApi } = useDataverseApi();

    const getContacts = useCallback(async () => {
      setShowLoader(true);

      try {
        // Fetch application data
        const res = await callApi<{ value: any[] }>({
          url: `/_api/${TableName.CONTACTS}?$filter=${ContactKeys.EMAILADDRESS1} eq '${user.email}'`,
          method: "GET",
        });

        const app = res?.value?.[0];
        if (!app) {
          throw new Error("No Contacts found with the provided email.");
        }
        // Update form state with mapped data
        setForm((prev) => ({
          ...prev,
          firstName: app[ContactKeys.FIRSTNAME] || "",
          lastName: app[ContactKeys.LASTNAME] || "",
          email: app[ContactKeys.EMAILADDRESS1] || "",
          phoneNumber: app[ContactKeys.TELEPHONE1] || "",
          mobilePhone: app[ContactKeys.MOBILEPHONE] || "",
          preferredMethodOfContact:
            app[ContactKeys.PREFERREDCONTACTMETHODCODE] || 0,
          contactId: app[ContactKeys.CONTACTID] || "",
          Institute: app[ContactKeys.institute] || "",
        }));
        // setDialogMessage("Profile loaded successfully!");
        // setShowSuccessDialog(true);
        toast({
          title: "Success",
          description: "Profile loaded successfully!",
        });
        setShowLoader(false);
      } catch (error) {
        console.error("Failed to load application details:", error);
        // setDialogMessage(
        //     error instanceof Error
        //         ? error.message
        //         : "Unable to load application details. Please try again."
        // );
        toast({
          title: "Failed",
          description: "Unable to load application details. Please try again.",
        });
        // setShowErrorDialog(true);
      } finally {
        setShowLoader(false);
      }
    }, [callApi]);

    useEffect(() => {
      if (user?.email) getContacts();
    }, [user?.email]);

    const handleSubmit = async () => {
      setShowLoader(true);
      try {
        // Add your submit logic here
        const res = await callApi({
          url: `/_api/${TableName.CONTACTS}(${form.contactId})`,
          method: "PATCH",
          data: {
            [ContactKeys.FIRSTNAME]: form.firstName,
            [ContactKeys.LASTNAME]: form.lastName,
            [ContactKeys.TELEPHONE1]: form.phoneNumber,
            [ContactKeys.MOBILEPHONE]: form.mobilePhone,
            [ContactKeys.PREFERREDCONTACTMETHODCODE]:
              form.preferredMethodOfContact,
          },
        });
        // setDialogMessage("Profile updated successfully!");
        // setShowSuccessDialog(true);
        if (res.status !== 204 && res.status !== 200) {
          throw new Error("No changes were made to the profile.");
        }
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
      } catch (error) {
        console.error("Failed to update profile:", error);
        // setDialogMessage(
        //     error instanceof Error
        //         ? error.message
        //         : "Unable to update profile. Please try again."
        // );
        // setShowErrorDialog(true);
        toast({
          title: "Failed",
          description: "Unable to update profile. Please try again.",
        });
      } finally {
        setShowLoader(false);
      }
    };

    const canSubmit = form.firstName && form.lastName && form.email;

    return (
      <>
        <OverlayLoader
          isVisible={showLoader}
          label="Your request is being processed..."
        />
        <section className="h-[calc(100vh-150px)] overflow-hidden bg-[#0f1840]">
          <Reveal className="h-full flex flex-col justify-center">
            <div className="container h-full py-4 md:py-4 grid gap-10 md:grid-cols-2 items-center justify-center">
              {/* Hero Collage */}
              <div className="relative flex justify-center md:justify-end">
                <img
                  src="/images/applyGrant.png"
                  alt="Illustration"
                  className="h-auto w-auto max-w-none"
                />
              </div>
              <div>
                <section className="bg-white">
                  <div className="container py-4">
                    <Reveal className="mt-8">
                      <div>
                        <Label>First Name</Label>
                        <TextField
                          value={form?.firstName}
                          onChange={(_, value) =>
                            setForm((prev) => ({
                              ...prev,
                              firstName: value || "",
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <TextField
                          value={form?.lastName}
                          onChange={(_, value) =>
                            setForm((prev) => ({
                              ...prev,
                              lastName: value || "",
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Email Address</Label>
                        <TextField disabled value={form?.email} />
                      </div>
                      <div>
                        <Label>Institute</Label>
                        <TextField disabled value={form?.Institute} />
                      </div>
                      <div>
                        <Label>Business Phone</Label>
                        <TextField
                          value={form?.phoneNumber}
                          onChange={(_, value) =>
                            setForm((prev) => ({
                              ...prev,
                              phoneNumber: value || "",
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Mobile Phone</Label>
                        <TextField
                          value={form?.mobilePhone}
                          onChange={(_, value) =>
                            setForm((prev) => ({
                              ...prev,
                              mobilePhone: value || "",
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Preferred Method of Contact</Label>
                        <Dropdown
                          placeholder="Select an option"
                          options={PreferredContactMethodCode.map((method) => ({
                            key: method.key,
                            text: method.text,
                          }))}
                          selectedKey={form?.preferredMethodOfContact}
                          onChange={(e, option) =>
                            setForm({
                              ...form,
                              preferredMethodOfContact:
                                parseInt(option?.key as string) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="mt-5 text-center">
                        <PrimaryButton
                          styles={{ root: { width: "200px" } }}
                          onClick={() => handleSubmit()}
                          disabled={!canSubmit}
                        >
                          {form?.contactId ? "Update Profile" : "Save Profile"}
                        </PrimaryButton>
                      </div>
                    </Reveal>
                  </div>
                </section>
              </div>
            </div>
          </Reveal>
        </section>

        <SuccessDialog
          hidden={!showSuccessDialog}
          message={dialogMessage}
          onDismiss={() => {
            navigate("/applications", { state: {} });
          }}
        />
        <ErrorDialog
          hidden={!showErrorDialog}
          message={dialogMessage}
          onDismiss={() => {
            setShowErrorDialog(false);
            //Navigate({to: "/applications", replace: true,state:{}});
          }}
        />
      </>
    );
}

