import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import {
  ADD_MEMBERS_TO_CHANNEL,
  HOST,
  SEARCH_CONTACTS_ROUTES,
} from "@/lib/constants";
import { useSocket } from "@/contexts/SocketContext";
import { useAppStore } from "@/store";
import { toast } from "sonner";
import { getColor } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Lottie from "react-lottie";
import { animationDefaultOptions } from "@/lib/utils";
import { FaCheck, FaUserCheck } from "react-icons/fa";
import axios from "axios";

const AddMembersToChannel = ({ channel, onClose }) => {
  const [allContacts, setAllContacts] = useState([]);
  const [searchedContacts, setSearchedContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const socket = useSocket();
  const { userInfo, updateChannelMembers } = useAppStore();

  // Get existing member IDs for filtering - ensure they're strings for comparison
  const existingMemberIds = channel.members.map((member) =>
    typeof member === "object" ? member._id : member
  );

  console.log("Existing member IDs:", existingMemberIds);

  // Fetch all contacts on component mount
  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        // Use searchContacts with an empty string to get all contacts
        const response = await apiClient.post(
          SEARCH_CONTACTS_ROUTES,
          { searchTerm: "" },
          { withCredentials: true }
        );

        if (response.status === 200 && response.data.contacts) {
          console.log(
            "All contacts:",
            response.data.contacts.map((c) => ({
              id: c._id,
              name: c.firstName,
            }))
          );

          // Filter out existing members and the admin from all contacts
          const filteredContacts = response.data.contacts.filter(
            (contact) =>
              !existingMemberIds.includes(contact._id) &&
              contact._id !== channel.admin._id
          );

          console.log(
            "Filtered contacts:",
            filteredContacts.map((c) => ({ id: c._id, name: c.firstName }))
          );

          setAllContacts(filteredContacts);
          // Initially show filtered contacts
          setSearchedContacts(filteredContacts);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast.error("Failed to fetch contacts");
      }
    };

    fetchAllContacts();
  }, [existingMemberIds, channel.admin._id]);

  // Filter contacts based on search term
  useEffect(() => {
    if (searchTerm.length > 0) {
      const searchContacts = async () => {
        try {
          const response = await apiClient.post(
            SEARCH_CONTACTS_ROUTES,
            { searchTerm },
            { withCredentials: true }
          );

          if (response.status === 200 && response.data.contacts) {
            // Filter out existing members and the admin from search results
            const filteredContacts = response.data.contacts.filter(
              (contact) =>
                !existingMemberIds.includes(contact._id) &&
                contact._id !== channel.admin._id
            );

            setSearchedContacts(filteredContacts);
          }
        } catch (error) {
          console.error("Error searching contacts:", error);
        }
      };

      searchContacts();
    } else {
      setSearchedContacts(allContacts);
    }
  }, [searchTerm, allContacts, existingMemberIds, channel.admin._id]);

  const addMembersToChannel = async () => {
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact to add");
      return;
    }

    try {
      const response = await apiClient.post(
        ADD_MEMBERS_TO_CHANNEL,
        {
          channelId: channel._id,
          members: selectedContacts.map((contact) => contact._id),
        },
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Members added successfully");

        // Update the channel members in the store
        updateChannelMembers(channel._id, response.data.newMembers);

        setSelectedContacts([]);
        onClose();

        // Emit socket event to notify other members
        socket.emit("channel-updated", {
          channelId: channel._id,
          updatedBy: userInfo.id,
          action: "add-members",
          newMembers: response.data.newMembers,
        });
      }
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error("Failed to add members to the channel");
    }
  };

  const toggleContactSelection = (contact) => {
    // Double-check that the contact is not already a member
    if (existingMemberIds.includes(contact._id)) {
      toast.error("This user is already a member of the channel");
      return;
    }

    setSelectedContacts((prev) => {
      const isSelected = prev.some((c) => c._id === contact._id);
      if (isSelected) {
        return prev.filter((c) => c._id !== contact._id);
      } else {
        return [...prev, contact];
      }
    });
  };

  // Check if a contact is already a member
  const isExistingMember = (contactId) => {
    return existingMemberIds.includes(contactId);
  };

  // Check if a contact is selected
  const isSelected = (contactId) => {
    return selectedContacts.some((contact) => contact._id === contactId);
  };

  // Get the first letter for avatar
  const getFirstLetter = (contact) => {
    if (contact.firstName && contact.firstName.length > 0) {
      return contact.firstName.charAt(0);
    } else if (contact.email && contact.email.length > 0) {
      return contact.email.charAt(0);
    }
    return "?";
  };

  // Get display name for contact
  const getDisplayName = (contact) => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    } else if (contact.firstName) {
      return contact.firstName;
    } else if (contact.username) {
      return contact.username;
    } else {
      return contact.email || "Unknown User";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogDescription className="hidden">
        Add members to the channel
      </DialogDescription>
      <DialogContent
        className="bg-[#181920] border-none text-white w-[400px] h-[500px] flex flex-col"
        style={{
          backgroundImage: "none !important",
          backgroundColor: "#181920 !important",
          background: "#181920 !important",
        }}
      >
        <DialogHeader>
          <DialogTitle>Add Members to {channel.name}</DialogTitle>
        </DialogHeader>
        <div>
          <Input
            placeholder="Search Contacts"
            className="rounded-lg p-6 bg-[#2c2e3b] border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-1 mt-4">
          {searchedContacts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {searchedContacts.map((contact) => {
                const isContactSelected = isSelected(contact._id);

                return (
                  <div
                    key={contact._id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isContactSelected
                        ? "bg-purple-900/30"
                        : "hover:bg-[#2c2e3b]"
                    }`}
                    onClick={() => toggleContactSelection(contact)}
                  >
                    <div className="w-10 h-10 relative">
                      <Avatar className="w-10 h-10 rounded-full overflow-hidden">
                        {contact.image ? (
                          <AvatarImage
                            src={`${HOST}/${contact.image}`}
                            alt="profile"
                            className="object-cover w-full h-full bg-black rounded-full"
                          />
                        ) : (
                          <div
                            className={`uppercase w-10 h-10 text-lg border-[1px] ${getColor(
                              contact.color
                            )} flex items-center justify-center rounded-full`}
                          >
                            {getFirstLetter(contact)}
                          </div>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {getDisplayName(contact)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {contact.email || "No email available"}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border ${
                        isContactSelected
                          ? "bg-purple-600 border-purple-600"
                          : "border-gray-500"
                      } flex items-center justify-center`}
                    >
                      {isContactSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Lottie
                options={animationDefaultOptions}
                height={150}
                width={150}
              />
              <p className="text-gray-400 mt-4">No contacts found</p>
            </div>
          )}
        </ScrollArea>
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedContacts.length} contact
            {selectedContacts.length !== 1 ? "s" : ""} selected
          </div>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={addMembersToChannel}
            disabled={selectedContacts.length === 0}
          >
            Add Members
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMembersToChannel;
