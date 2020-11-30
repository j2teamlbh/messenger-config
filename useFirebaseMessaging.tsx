import PushIOS from "@react-native-community/push-notification-ios";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import PushNotification, {
  PushNotificationObject,
} from "react-native-push-notification";

const handleIosPushNotification = (notification: any) =>
  PushIOS.addNotificationRequest({
    id: notification.messageId,
    body: notification.message.body,
    badge: notification.badge || 1,
    userInfo: {
      type: notification.data.type,
      userId: notification.data.userId,
      body: notification.message.body,
      showNotification: true,
    },
  });

const _initConfig = () => {
  PushNotification.configure({
    onNotification: (notification: any) => {
      if (notification) {
        if (Platform.OS === "ios" && notification.foreground) {
          handleIosPushNotification(notification);
          return;
        }
        let isValid = Platform.OS === "ios";
        if (Platform.OS === "android") {
          isValid =
            notification.userInteraction || notification["google.message_id"];
        }
        if (isValid) {
          //Hành động sau khi nhấn vào notification
        }
        if (Platform.OS === "ios" && !notification.foreground) {
          notification.finish(PushIOS.FetchResult.NoData);
        }
      }
    },
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
    popInitialNotification: true,
    requestPermissions: true,
  });
};

type NotificationDataType = {
  type: string;
  userId?: string;
  parentCommentId?: string;
  postId?: string;
  commentId?: string;
};

const handlePushNotifications = (
  message: string,
  remoteMessage: object,
  priority: PushNotificationObject["priority"] = "default"
) => {
  PushNotification.localNotification({
    channelId: "default",
    message,
    largeIcon: "ic_launcher",
    smallIcon: "ic_notification",
    color: "red",
    priority,
    ...remoteMessage,
  });
};

const useAndroidMessaging = () => {
  const getToken = useCallback(async () => {
    try {
      const hasPermission = messaging().hasPermission();
      if (hasPermission) {
        const token = await messaging().getToken();
        if (token) {
          //Lưu token
        }
        //Tạo channel mặc định nếu chưa có.
        //Không tạo sẽ bị lỗi không hiện notification khi app đang mở sau khi cài đặt lần đầu bên android
        //Vì channel sẽ chỉ tự tạo khi nhận notification từ firebase khi app đang không bật
        PushNotification.channelExists("default", (exists) => {
          if (!exists) {
            const channelOptions = {
              channelId: "default",
              channelName: "Default",
            };
            PushNotification.createChannel(channelOptions, () => {});
          }
        });
      }
    } catch (error) {}
  }, []);

  const onOpenNotification = useCallback(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (remoteMessage) {
        const message =
          remoteMessage.notification?.body || remoteMessage.data?.body || "";
        handlePushNotifications(message, remoteMessage, "high");
      }
    },
    []
  );

  useEffect(() => {
    if (Platform.OS === "ios") {
      return;
    }
    getToken();
    const unsubscribe = messaging().onMessage(onOpenNotification);
    return () => {
      messaging().onTokenRefresh((token) => {
        //Lưu lại token khi token bị refresh
      });
      unsubscribe();
    };
  }, [getToken, onOpenNotification]);

  return null;
};

const useIosMessaging = () => {
  const onLocalNotification = useCallback((notification: any) => {
    if (notification) {
      //Hành động khi nhận notification
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      return;
    }
    setTimeout(() => {
      //Get notification khi nhấn từ thanh thông báo và app đang tắt
      PushIOS.getInitialNotification().then(onLocalNotification);
    }, 1000);
    PushIOS.addEventListener("register", onRegistered);
    PushIOS.addEventListener("registrationError", onRegistrationError);
    PushIOS.requestPermissions();

    return () => {
      PushIOS.removeEventListener("register");
      PushIOS.removeEventListener("registrationError");
    };
  }, [onLocalNotification]);

  const onRegistered = (deviceToken: string) => {
    //Lưu device token
  };

  const onRegistrationError = (error: {
    message: string;
    code: number;
    details: any;
  }) => {
    if (error.message.indexOf("simulator") === -1) {
      console.log(error.message);
    }
  };

  return null;
};

const useFirebaseMessaging = () => {
  _initConfig();
  useAndroidMessaging();
  useIosMessaging();
  return null;
};

export default useFirebaseMessaging;
