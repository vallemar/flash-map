<template>
  <Page actionBarHidden="true" style="background-color: white">
    <ActionBar>
      <Label text="Home"/>
    </ActionBar>

    <GridLayout rows="*,auto" style="background-color: white">
      <GridLayout row="0" rows="*,auto" style="background-color: white">
        <MapView
            rowSpan="2"
            ref="map"
        />
      </GridLayout>
    </GridLayout>
  </Page>
</template>


<style lang="scss">


.full-screen {
  height: 100%;
  width: 100%;
}
</style>
