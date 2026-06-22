package com.jjplatform.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BeltIcon")
public class BeltIconPlugin extends Plugin {

    private static final String PKG = "com.jjplatform.app";

    private static final String[] ALL_ALIASES = {
        PKG + ".MainActivityBeltWhite",
        PKG + ".MainActivityBeltBlue",
        PKG + ".MainActivityBeltPurple",
        PKG + ".MainActivityBeltBrown",
        PKG + ".MainActivityBeltBlack",
    };

    @PluginMethod
    public void setBelt(PluginCall call) {
        String belt = call.getString("belt", "WHITE");
        String target = aliasForBelt(belt);
        PackageManager pm = getContext().getPackageManager();

        for (String alias : ALL_ALIASES) {
            int state = alias.equals(target)
                ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
            pm.setComponentEnabledSetting(
                new ComponentName(PKG, alias),
                state,
                PackageManager.DONT_KILL_APP
            );
        }
        call.resolve();
    }

    private String aliasForBelt(String belt) {
        if (belt == null) return PKG + ".MainActivityBeltWhite";
        switch (belt.toUpperCase()) {
            case "BLUE":   return PKG + ".MainActivityBeltBlue";
            case "PURPLE": return PKG + ".MainActivityBeltPurple";
            case "BROWN":  return PKG + ".MainActivityBeltBrown";
            case "BLACK":  return PKG + ".MainActivityBeltBlack";
            default:       return PKG + ".MainActivityBeltWhite";
        }
    }
}
