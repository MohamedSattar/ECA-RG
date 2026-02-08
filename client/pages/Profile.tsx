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
        <section className="min-h-screen bg-[#1D2054] py-12">
          <Reveal className="flex flex-col justify-center">
            <div className="container py-8 grid gap-10 md:grid-cols-2 items-start lg:items-center">
              {/* Hero Collage */}
              <div className="relative flex justify-center md:justify-end">
                <img
                  src="/images/applyGrant.png"
                  alt="Illustration"
                  className="h-auto w-auto max-w-none"
                />
              </div>
              <div>
                <section className="bg-white rounded-xl shadow-lg">
                  <div className="container py-8 px-8">
                    <h1 className="text-3xl font-bold text-[#1e293b] mb-8">
                      Update Profile
                    </h1>
                    <Reveal className="mt-6">
                      <div className="grid gap-6">
                        <div>
                          <Label htmlFor="firstName" className="text-[#1e293b] font-semibold">
                            First Name
                          </Label>
                          <div className="mt-2">
                            <TextField
                              id="firstName"
                              value={form?.firstName}
                              onChange={(_, value) =>
                                setForm((prev) => ({
                                  ...prev,
                                  firstName: value || "",
                                }))
                              }
                              borderless
                              placeholder="Enter your first name"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-[#1e293b] font-semibold">
                            Last Name
                          </Label>
                          <div className="mt-2">
                            <TextField
                              id="lastName"
                              value={form?.lastName}
                              onChange={(_, value) =>
                                setForm((prev) => ({
                                  ...prev,
                                  lastName: value || "",
                                }))
                              }
                              borderless
                              placeholder="Enter your last name"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-[#1e293b] font-semibold">
                            Email Address
                          </Label>
                          <div className="mt-2">
                            <TextField
                              id="email"
                              disabled
                              value={form?.email}
                              borderless
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="institute" className="text-[#1e293b] font-semibold">
                            Institute
                          </Label>
                          <div className="mt-2">
                            <TextField
                              id="institute"
                              disabled
                              value={form?.Institute}
                              borderless
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="mobilePhone" className="text-[#1e293b] font-semibold">
                            Mobile Phone
                          </Label>
                          <div className="mt-2">
                            <TextField
                              id="mobilePhone"
                              type="tel"
                              value={form?.mobilePhone}
                              onChange={(_, value) => {
                                const numericValue = (value || "").replace(/[^\d]/g, "");
                                setForm((prev) => ({
                                  ...prev,
                                  mobilePhone: numericValue,
                                }))
                              }}
                              borderless
                              placeholder="Enter your mobile phone"
                            />
                          </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
                          <PrimaryButton
                            onClick={() => handleSubmit()}
                            disabled={!canSubmit}
                            styles={{
                              root: {
                                width: "100%",
                                backgroundColor: '#1D2054',
                                borderColor: '#1D2054',
                                height: '44px',
                                fontSize: '16px',
                                fontWeight: '600',
                              },
                              rootHovered: {
                                backgroundColor: '#151b41',
                                borderColor: '#151b41',
                              },
                              rootDisabled: {
                                backgroundColor: '#cbd5e1',
                                borderColor: '#cbd5e1',
                              },
                            }}
                          >
                            {form?.contactId ? "Update Profile" : "Save Profile"}
                          </PrimaryButton>
                        </div>
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
