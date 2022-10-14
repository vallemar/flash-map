<template>
  <Page actionBarHidden="true" >
    <ActionBar>
      <Label text="Home"/>
    </ActionBar>

    <StackLayout >

      <button text="Navigate" @tap="navigate" backgroundColor="red" />
    </StackLayout>


  </Page>
</template>

<script lang="ts">
import Vue from "nativescript-vue";
import Home2 from "~/components/Home2.vue";


export default Vue.extend({

  methods: {
    navigate() {
      this.$navigateTo(Home2, {
        transition: {
          name: "slideLeft",
          duration: 300,
          curve: "easeIn"
        },
      });
    },

  }
});
</script>

<style lang="scss">


.full-screen {
  height: 100%;
  width: 100%;
}
</style>
