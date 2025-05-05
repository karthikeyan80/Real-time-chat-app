useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    
    // If there's a message currently playing, ensure its controls are visible
    if (currentlyPlaying && messageRefs.current[currentlyPlaying]) {
      scrollToShowAudioControls(currentlyPlaying);
    }
  }, [selectedChatMessages, currentlyPlaying]);