import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaPlus } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import {
  CREATE_CHANNEL,
  GET_ALL_CONTACTS,
  SEARCH_CONTACTS_ROUTES,
} from "@/lib/constants";
import { useSocket } from "@/contexts/SocketContext";
import { useAppStore } from "@/store";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { FaCheck } from "react-icons/fa";

const CreateChannel = () => {
  const [newChannelModal, setNewChannelModal] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [searchedContacts, setSearchedContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [channelName, setChannelName] = useState("");
  const socket = useSocket();
  const { addChannel } = useAppStore();

  useEffect(() => {
    const getData = async () => {
      try {
        const response = await apiClient.get(GET_ALL_CONTACTS, {
          withCredentials: true,
        });
        if (response.data && response.data.contacts) {
          const contacts = response.data.contacts;
          setAllContacts(contacts);
          setSearchedContacts(contacts);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast.error("Failed to load contacts");
      }
    };
    if (newChannelModal) {
      getData();
    }
  }, [newChannelModal]);

  const searchContacts = async (searchTerm) => {
    try {
      if (searchTerm && searchTerm.length > 0) {
        const response = await apiClient.post(
          SEARCH_CONTACTS_ROUTES,
          { searchTerm },
          { withCredentials: true }
        );
        if (response.status === 200 && response.data.contacts) {
          setSearchedContacts(response.data.contacts);
        }
      } else {
        setSearchedContacts(allContacts);
      }
    } catch (error) {
      console.error("Error searching contacts:", error);
      toast.error("Failed to search contacts");
    }
  };

  const toggleContactSelection = (contact) => {
    setSelectedContacts((prev) => {
      const isSelected = prev.some((c) => c.value === contact._id);
      if (isSelected) {
        return prev.filter((c) => c.value !== contact._id);
      } else {
        return [
          ...prev,
          {
            value: contact._id,
            label: `${contact.firstName} ${contact.lastName}`,
          },
        ];
      }
    });
  };

  const isContactSelected = (contactId) => {
    return selectedContacts.some((contact) => contact.value === contactId);
  };

  const createChannel = async () => {
    if (!channelName || selectedContacts.length === 0) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const memberIds = selectedContacts.map((contact) => contact.value);

      const response = await apiClient.post(
        CREATE_CHANNEL,
        {
          name: channelName,
          members: memberIds,
        },
        { withCredentials: true }
      );

      if (response.status === 201) {
        setChannelName("");
        setSelectedContacts([]);
        setNewChannelModal(false);

        // Add the channel to the local state first
        addChannel(response.data.channel);

        // Then notify other members via socket
        if (socket && typeof socket.emit === "function") {
          socket.emit("add-channel-notify", response.data.channel);
        } else {
          console.warn("Socket connection not available");
        }

        toast.success("Channel created successfully");
      }
    } catch (error) {
      console.error("Error creating channel:", error);
      toast.error(error?.response?.data?.message || "Failed to create channel");
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              className=" text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => setNewChannelModal(true)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3">
            Create New Channel
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={newChannelModal} onOpenChange={setNewChannelModal}>
        <DialogDescription className="hidden">
          Please insert details
        </DialogDescription>
        <DialogContent className="bg-[#181920] border-none text-white w-[400px] h-max flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create a new Channel</DialogTitle>
          </DialogHeader>
          <div>
            <Input
              placeholder="Channel Name"
              className="rounded-lg py-6 px-4 bg-[#2c2e3b] border-none"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
          </div>
          <div>
            <Input
              placeholder="Search Contacts"
              className="rounded-lg py-6 px-4 bg-[#2c2e3b] border-none"
              onChange={(e) => searchContacts(e.target.value)}
            />
          </div>
          <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
            <div className="flex flex-col gap-2">
              {searchedContacts.map((contact) => {
                const isSelected = isContactSelected(contact._id);
                return (
                  <div
                    key={contact._id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isSelected ? "bg-purple-900/30" : "hover:bg-[#2c2e3b]"
                    } cursor-pointer`}
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
                            {contact.firstName && contact.firstName.length > 0
                              ? contact.firstName.split("")[0]
                              : contact.email && contact.email.length > 0
                              ? contact.email.split("")[0]
                              : "?"}
                          </div>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {contact.firstName && contact.lastName
                          ? `${contact.firstName} ${contact.lastName}`
                          : contact.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {contact.email}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border ${
                        isSelected
                          ? "bg-purple-600 border-purple-600"
                          : "border-gray-500"
                      } flex items-center justify-center`}
                    >
                      {isSelected && <FaCheck className="text-white text-xs" />}
                    </div>
                  </div>
                );
              })}
              {searchedContacts.length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  No contacts found
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto">
            <Button
              onClick={createChannel}
              className="w-full bg-purple-700 hover:bg-purple-900 transition-all duration-300"
            >
              Create Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateChannel;
