package com.jjplatform.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BeltIconPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
