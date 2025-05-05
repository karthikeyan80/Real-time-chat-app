import ContactList from "@/components/common/contact-list";
import Logo from "@/components/common/logo";
import ProfileInfo from "./components/profile-info";
import apiClient from "@/lib/api-client";
import {
  GET_CONTACTS_WITH_MESSAGES_ROUTE,
  GET_USER_CHANNELS,
} from "@/lib/constants";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import NewDM from "./components/new-dm/new-dm";
import CreateChannel from "./components/create-channel/create-channel";

const ContactsContainer = () => {
  const {
    setDirectMessagesContacts,
    directMessagesContacts,
    channels,
    setChannels,
  } = useAppStore();

  useEffect(() => {
    const getContactsWithMessages = async () => {
      const response = await apiClient.get(GET_CONTACTS_WITH_MESSAGES_ROUTE, {
        withCredentials: true,
      });
      if (response.data.contacts) {
        setDirectMessagesContacts(response.data.contacts);
      }
    };
    getContactsWithMessages();
  }, [setDirectMessagesContacts]);

  useEffect(() => {
    const getChannels = async () => {
      const response = await apiClient.get(GET_USER_CHANNELS, {
        withCredentials: true,
      });
      if (response.data.channels) {
        setChannels(response.data.channels);
      }
    };
    getChannels();
  }, [setChannels]);

  const [isLoadingDMs, setIsLoadingDMs] = useState(true);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  
  // Add loading effect when component mounts
  useEffect(() => {
    // Set a timeout to simulate loading and prevent flash of "no contacts" message
    const dmTimer = setTimeout(() => {
      setIsLoadingDMs(false);
    }, 1000);
    
    const channelTimer = setTimeout(() => {
      setIsLoadingChannels(false);
    }, 1000);
    
    // Clean up timers
    return () => {
      clearTimeout(dmTimer);
      clearTimeout(channelTimer);
    };
  }, []);

  return (
    <div className="relative md:w-[35vw] lg:w-[30vw] xl:w-[20vw] bg-[#1b1c24] border-r-2 border-[#2f303b] w-full">
      <div className=" pt-3">
        <Logo />
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Direct Messages" />
          <NewDM />
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          {isLoadingDMs ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="contacts-loading"></div>
              <p className="text-neutral-400 text-sm mt-3">Loading contacts...</p>
            </div>
          ) : directMessagesContacts && directMessagesContacts.length > 0 ? (
            <div className="fade-in">
              <ContactList contacts={directMessagesContacts} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 px-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center mb-3">
                  <span className="text-purple-400 text-xl font-bold">!</span>
                </div>
                <div className="text-purple-400 font-medium text-center mb-2">No Contacts</div>
                <p className="text-neutral-300 text-xs text-center">
                  Click the + button to start a new conversation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Channels" />
          <CreateChannel />
        </div>
        <div className="max-h-[37vh] overflow-y-auto scrollbar-hidden pb-5">
          {isLoadingChannels ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="channels-loading"></div>
              <p className="text-neutral-400 text-sm mt-3">Loading channels...</p>
            </div>
          ) : channels && channels.length > 0 ? (
            <div className="fade-in">
              <ContactList contacts={channels} isChannel={true} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 px-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center mb-3">
                  <span className="text-purple-400 text-xl font-bold">!</span>
                </div>
                <div className="text-purple-400 font-medium text-center mb-2">No Channels</div>
                <p className="text-neutral-300 text-xs text-center">
                  Click the + button to create a new channel
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <ProfileInfo />
    </div>
  );
};

export default ContactsContainer;

const Title = ({ text }) => {
  return (
    <h6 className="uppercase tracking-widest text-neutral-400 pl-10 font-light text-opacity-90 text-sm">
      {text}
    </h6>
  );
};
