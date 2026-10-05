---
title: '第八章 透明效果'
date: 2026-10-02
updated: 2026-10-02
categories: UnityShader入门精要-URP改编
cover: https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251203145913_%E8%BE%89%E5%A4%9C2.jpg
tags:
  - UnityShader
  - Shaderlab
  - TA
  - 图形学
top: 1
---

透明是游戏中经常要使用的一种效果。在实时渲染中要实现透明效果，通常会在渲染模型时控制它的透明通道（Alpha Channel）。当开启透明混合后，当一个物体被渲染到屏幕上时，每个片元除了 颜色值和深度值之外，还有另一个属性——透明度。当透明度为1时，表示该像素是完全不透明，为0时，表示该像素完全不显示。

在Unity中，我们通常使用两种方法来实现透明效果：第一种是使用**透明度测试（Alpha Test）**，这种方法没法得到真正的半透明效果；另一种是**透明度混合（Alpha Blending）**。

在前文中，我们从来没有强调过渲染顺序的问题，也就是说当场景中有很多模型时，我们并没有考虑是先渲染A还是B。事实上，对于不透明（opaque）物体，不考虑它们的渲染顺序也能得到正确的排序效果，这是由于强大的深度缓冲（depth buffer，也被称为z-buffer）的存在。在实时渲染中，深度缓冲是用于解决可见性（visibility）问题的，它可以决定哪个物体的哪些部分会被渲染在前面，而哪些部分会被其他物体遮挡。它的基本思想是：根据深度缓冲中的值来判断该片元距离摄像机的距离，当渲染一个片元时，需要把它的深度值与已经存在于深度缓冲中的值进行比较（如果开启了深度测试ZTest），如果它的值距离摄像机更远，那么说明这个片元不应该被渲染在屏幕上（有物体遮住了它）；否则，这个片元应该覆盖掉此时颜色缓冲中的像素值，并把它的深度值更新到深度缓冲中（如果开启了深度写入ZWrite）。

使用深度缓冲，可以让我们不用关心不透明物体的渲染顺序，例如A挡住了B，即便我们先渲染A再渲染B也不用担心B会遮盖住A，因为再进行深度测试时会判断出B距离摄像机更远，也就不会写入到颜色缓冲中。但如果想要实现透明效果，事情就不那么简单了，这是因为，当使用透明度混合时，我们关闭了深度写入（ZWrite）

简单来说，透明度测试和透明度混合的基本原理如下：

+ **透明度测试：** 它采用一种很极端的机制，只要一个片元的透明度不满足调节（通常是小于某个阈值），那么它对应的片元就会被舍弃，被舍弃的片元将不会再进行任何处理，也不会对颜色缓冲产生任何影响。否则就按照普通的不透明物体的处理方式处理它，即进行深度测试、深度写入等。也就是说透明度测试是不需要关闭深度写入的。虽然简单，但它产生的效果很极端，要么完全透明，看不见，要么完全不透明。
+ **透明度混合：** 这种方法可以得到真正的半透明效果。他会使用当前片元的透明度作为混合因子，与已经存储在颜色缓冲中的颜色值进行混合，得到新的颜色。但是透明度混合需要关闭深度写入，这使得我们要非常小心物体的渲染顺序。需要注意的是，只关闭了深度写入，没有关闭深度测试，这意味着，当使用透明度混合渲染一个片元时，还是会比较它的深度值与当前深度缓冲中的深度值，如果它的深度值距离摄像机更远，那么它就不会再进行混合操作。这一点决定了，当一个不透明物体出现在了一个透明物体前面，而我们先渲染了这个不透明物体，它仍然可以正常地遮挡住透明物体（因为渲染这个不透明物体的时候更新了深度缓冲中的值，再渲染透明物体的时候没有通过深度测试不会被渲染）。也就是说，对于透明度混合来说，深度缓冲是只读的。

# 渲染顺序
在前面我们说了，透明度混合中，我们需要关闭深度写入，那么为什么要关闭深度写入？如果不关闭深度写入，一个半透明表面背后的表面本来是可以透过它看到的，但由于深度测试的结果判断结果是该半透明表面距离摄像机更近，导致后面的不透明表面被剔除。但是，我们由此就破坏了深度缓冲的工作机制，而这是一个非常非常非常糟糕的事情，尽管我们不得不这样做。关闭深度写入导致渲染顺序变得非常重要。

我们来考虑两种情况，假如有两个物体A和B，A是半透明物体，B是不透明物体，A距离摄像机更近。

+ 第一种情况：我们先渲染B再渲染A，那么由于不透明物体开启了深度测试和深度写入，此时深度缓冲中没有任何有效数据，因此B首先会写入颜色缓冲和深度缓冲。随后我们渲染A，透明物体仍然会进行深度测试，因此我们法线B相比A距离摄像机更近，因此，我们会使用A的透明度来和颜色缓冲中的B的颜色进行混合，得到正确的半透明效果。
+ 第二种情况：我们先渲染A再渲染B。渲染A时，深度缓冲区中没有任何有效数据，因此A直接写入颜色缓冲，但由于对半透明物体关闭的深度写入，因此A不会修改深度缓冲。等到渲染B时，B会进行深度测试，法线深度缓冲中没有任何值，这时B因为不是透明度混合，而会按照不透明物体的方式直接写入颜色缓冲，结果就是B会直接覆盖掉A的颜色。从视觉上看，B就出现在了A的前面，而这是错误的。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779734902506-a0c13008-afa8-4f97-ac60-ea61b2905a74.png)

这里就可以看出，渲染顺序有多么重要。所以，我们应该在渲染不透明物体之后再渲染半透明物体。那么如果都是半透明物体，渲染顺序还重要吗？答案是肯定的。假设有A和B两个物体都是半透明物体，A距离摄像机更近。

+ 第一种情况：我们先渲染B再渲染A。那么B会正常写入颜色缓冲，然后A会和颜色缓冲中的B颜色进行混合，得到正确的半透明效果。
+ 第二种情况：我们先渲染A再渲染B，那么A会先写入颜色缓冲，随后B回合缓冲中的A进行混合，这样混合结果会完全反过来，看起来就好像B在A前面，得到的就是错误的半透明结构。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779734918360-f7f00010-31fa-4079-b50b-59ebb4e9dc5c.png)

所以，渲染顺序很重要。

基于这两点，渲染引擎一般都会先对物体进行排序，再渲染。常用的方法是：

1. 先渲染所有的不透明物体，并对它们开启深度测试和深度写入；
2. 把半透明物体按它们距离摄像机的远近进行排序，然后按照从后往前的顺序渲染这些半透明物体，并开启它们的深度测试，但关闭深度写入。

但是很遗憾的是，问题并没有完全解决，在一些情况下，半透明物体还是会出现“穿帮镜头”。如果我们仔细想想，上面给出的第二步中渲染顺序仍然是含糊不清的，按它们距离摄像机的远近进行排序，那么它们距离摄像机的远近是如何决定的？正常人可能会说是距离摄像机的深度值，但是，深度缓冲中的值其实是像素级别的，即每个像素都有个深度值，但是现在我们对单个物体级别进行排序，这意味着排序结果是，要么A全部都在B前面渲染，要么A全部都在B后面渲染。但如果存在A的一部分在B前面，另一部分在B的后面，那么使用这种方法就永远无法得到正确的结果，如下图

<!-- 这是一张图片，ocr 内容为： -->
![互相遮盖的三个物体](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779734783426-2951f64f-8605-4f96-a53a-f4e238a147b6.png)

这种时候，我们可以选择把物体拆分成若干个部分，然后再进行正确的排序，即分割网格。为了减少错误排序的情况，我们可以尽可能让模型是凸面体，并且考虑将复杂的模型拆分成可以独立排序的多个子模型。其实就算排序错误结果有时也不会非常糟糕，如果我们不想分割网络，可以试着让透明通道更加柔和，使穿插看起来并不是那么明显，我们也可以使用开启深度写入的半透明效果来近似模拟物体的半透明。

下面我们看看Unity是如何解决排序问题的。

# Unity Shader的渲染顺序
Unity为了解决渲染顺序的问题提供了渲染队列（render queue）这一解决方案。我们可以使用SubShader的Queue标签来决定我们的模型将属于哪个渲染队列。Unity在内部使用一系列整数索引来表示每个渲染队列，且索引号越小表示越早被渲染。Unity给了下面5种预设的渲染队列：

| 名称 | 队列索引号 | 描述 |
| --- | --- | --- |
| Background | 1000 | 这个渲染队列会在任何其他队列之前被渲染，我们通常使用该队列来渲染那些需要绘制再背景上的物体 |
| Geometry | 2000 | 默认的渲染队列，大多数物体都使用这个队列。不透明物体使用这个队列 |
| AlphaTest | 2450 | 需要透明度测试的物体使用这个队列。 |
| Transparent | 3000 | 这个队列中的物体会在所有Geometry和AlphaTest物体渲染后，再按从后往前的顺序进行渲染，任何使用了透明度混合（例如关闭了深度写入的Shader）的物体都应该使用该队列 |
| Overlay | 4000 | 该队列用于实现一些叠加效果。任何需要在最后渲染的物体都应该使用该队列。 |


但是在URP中，Queue标签不再决定渲染顺序，仅作为ID标识。

因此，如果我们想要通过透明度测试实现透明效果，代码中应该包含类似下面的代码：

```shaderlab
SubShader
{
    Tags {
        "RenderPipeline" = "UniversalPipeline"
        "Queue" = "AlphaTest" }
    Pass
    {
    }
}
```

如果我们想要通过透明度混合来实现透明效果，代码中应该包含类似下面的代码：

```shaderlab
SubShader
{
    Tags {
        "RenderPipeline" = "UniversalPipeline"
        "Queue" = "Transparent" }
    Pass
    {
        ZWrite Off
    }
}
```

其中，ZWrite Off用于关闭深度写入，在这里我们选择把它写在Pass中，我们也可以把它写在SubShader中，这意味着SubShader下的所有Pass都会关闭深度写入。

# 透明度测试
通常我们会在片元着色器中使用clip函数来进行透明度测试，clip的定义如下：

:::info
函数：void clip(float4 x); void clip(float3 x); void clip(float2 x); void clip(float x);

参数：裁剪时使用的标量或矢量调节。

描述：如果给定参数的任何一个分量是负数，就会舍弃当前像素的输出颜色。它等同于下面的代码：

:::

```shaderlab
void clip(float4 x)
{
    if(any(x < 0))
        discard;
}
```

这里我们将会使用本书资源中的transparent_texture.psd纹理来实现透明度测试，这个透明纹理四个格子透明度均不同。

<!-- 这是一张图片，ocr 内容为： -->
![不同透明度的四个格子](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779734824896-d492dea5-b10f-459e-b5fa-2477640ebf33.png)

我们首先在Properties中声明一个范围在[0, 1]之间的属性_Cutoff来控制透明度测试时使用的阈值：

```shaderlab
Properties
{
    _Color ("Color", Color) = (1, 1, 1, 1)
    _BaseMap ("Base Map", 2D) = "white" {}
    _Cutoff ("Alpha Cutoff", Range(0, 1)) = 0.5
}
```

然后我们指明了若干标签：

```shaderlab
SubShader
{
    Tags {
        "RenderPipeline" = "UniversalPipeline"
        "Queue" = "AlphaTest"
        "RenderType" = "TransparentCutout"
    }
    Pass
    {
        Tags { "LightMode" = "UniversalForward" }
```

我们刚刚已经知道了渲染顺序的重要性，并且知道在Unity中透明度测试使用的渲染队列是名为AlphaTest的队列，因此我们需要把Queue标签设置为AlphaTest（如果不设置默认为Geometry）。而RenderType标签可以让Unity把这个Shader归入提前定义的组（这里就是TransparentCutout，不设置的话默认为Opaque不透明物体，透明度混合使用Transparent），以指明该Sahder是一个使用了透明度测试的Shader。

后面的输入输出结构体和顶点着色器与上一章的单张纹理Shader的内容一样。

直接看最重要的片元着色器部分：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;

    half4 texColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
    clip(texColor.a - _Cutoff);

    half3 albedo = texColor.rgb * _Color.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;
    half lambert = saturate(dot(normalWS, lightDirWS));
    half3 diffuse = mainLight.color * albedo * lambert;

    half3 finalColor = ambient + diffuse;

    return half4(finalColor, 1.0);
}
```

其实与上一章的单张纹理部分相比，就变化了一部分，把主纹理单独采样进一个变量texColor，使用texColor.a也就是透明度来进行测试。前面我们已经提到过clip函数的定义，它会判断它的参数，即texColor.a - _Cutoff是否为负数，如果是就会舍弃该片元的输出，也就是说，当texColor.a小于材质参数_Cutoff时，该片元会产生完全透明的效果。后面的代码就是正常的求漫反射光照。

完整代码：

```shaderlab
Shader "Unlit/AlphaTest"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _Cutoff ("Alpha Cutoff", Range(0, 1)) = 0.5
    }
    SubShader
    {
        Tags {
            "RenderPipeline" = "UniversalPipeline"
            "Queue" = "AlphaTest"
            "RenderType" = "TransparentCutout"
        }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            
            CBUFFER_START(UnityPerMaterial)
            half4 _Color;
            float4 _BaseMap_ST;
            float _Cutoff;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv0 : TEXCOORD2;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                
                half4 texColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
                clip(texColor.a - _Cutoff);
                
                half3 albedo = texColor.rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half lambert = saturate(dot(normalWS, lightDirWS));
                half3 diffuse = mainLight.color * albedo * lambert;
                
                half3 finalColor = ambient + diffuse;
                
                return half4(finalColor, 1.0);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

<!-- 这是一张图片，ocr 内容为： -->
![参数为0.65](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779726823829-4d366caf-f48f-41ba-9abd-2e45101c95b3.png)<!-- 这是一张图片，ocr 内容为： -->
![参数为0.75](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779726859523-1d207ceb-134b-45e0-a270-59f2e534524a.png)

从这两个图中可以看出，透明度测试得到的透明效果很极端，要么完全透明，要么完全不透明，它的效果往往像在一个不透明物体上挖了一个空洞。而且，得到的透明效果在边缘处往往参差不齐，有锯齿，这是因为在边界处纹理的透明度的变化精度问题。为了得到更加柔滑的透明效果，就可以使用透明度混合。

# 透明度混合
透明度混合的实现要比透明度测试复杂一些，这是因为我们在处理透明度测试时，实际上跟对待普通的不透明物体几乎是一样的，只是在片元着色器中增加了对透明度判断并裁剪片元的代码。而想要实现透明度混合就没那么简单了。我们回顾之前提到的透明度混合的原理：

**透明度混合：** 这种方法可以得到真正的半透明效果。他会使用当前片元的透明度作为混合因子，与已经存储在颜色缓冲中的颜色值进行混合，得到新的颜色。但是透明度混合需要关闭深度写入，这使得我们要非常小心物体的渲染顺序。

为了进行混合，我们需要使用Unity提供的混合命令——Blend。Blend是Unity提供的设置混合模式的命令。想要实现半透明的效果就需要把当前自身的颜色和已经存在于颜色缓冲中的颜色值进行混合，混合时使用的函数就是由该命令决定的。下面给出Blend命令的语义：

| 语义 | 描述 |
| --- | --- |
| Blend Off | 关闭混合 |
| Blend SrcFactor DstFactor | 开启混合，并设置混合因子。源颜色（该片元产生的颜色）会乘以SrcFactor，而目标颜色（已经存在于颜色缓冲中的颜色）会乘以DstFactor，然后把两者相加后再存入颜色缓冲中。 |
| Blend SrcFactor DstFactor, SrcFactorA DstFactorA | 和上面几乎一样，只是使用不同的因子来单独混合透明通道 |
| BlendOp BlendOperation | 并非是把源颜色和目标颜色简单相加后混合，而是使用BlendOperation对它们进行其他操作。 |


这里我们使用第二种语义，即Blend SrcFactor DstFactor来进行混合。需要注意的是，这个命令在设置混合因子的同时也会开启混合模式，这是因为，只有开启了混合之后，设置片元的透明通道才有意义，也就是片元着色器返回值的A通道。我们会把源颜色的混合因子SrcFactor设置为SrcAlpha，而目标颜色的混合因子DstFactor设为OneMinusSrcAlpha。

:::info
SrcAlpha指的是因子为源颜色的透明度值（A通道），也就是说根据透明度值来调整源颜色所占的比例

OneMinusSrcAlpha指的是因子为（1 - 源颜色的透明度值），也就是（1 - SrcAlpha）

更多属性详见ShaderLab的混合指令

:::

这意味着，经过混合后新的颜色是：

$$DstColor_{new}=SrcAlpha×SrcColor+(1-SrcAlpha)×DstColor_{old}$$

其中，$SrcColor$就是源颜色，$DstColor_{old}$是目标颜色。

我们直接从上一节透明度测试的代码基础上修改，首先修改Properties，使用一个新的属性_AlphaScale来代替原先的_Cutoff属性，用于再透明纹理的基础上控制整体的透明度：

```shaderlab
Properties
{
    _Color ("Color", Color) = (1, 1, 1, 1)
    _MainTex ("Main Tex", 2D) = "white" {}
    _AlphaScale ("Alpha Scale", Range(0, 1)) = 1
}
```

然后修改SubShader使用的标签：

```shaderlab
SubShader
{
    Tags {
        "RenderPipeline" = "UniversalPipeline"
        "Queue" = "Transparent"
        "RenderType" = "Transparent"
    }
```

把Queue设置为Transparent，使用Transparent队列。然后RenderType标签可以让Unity把这个Shader归入到提前定义的组（这里是Transparent组）中，用来指明该Shader是一个使用了透明度混合的Shader。

与透明度测试不同的是，我们还需要再Pass中为透明度混合进行合适的混合状态设置：

```shaderlab
Pass
{
    Tags { "LightMode" = "UniversalForward" }

    ZWrite Off
    Blend SrcAlpha OneMinusSrcAlpha
```

ZWrite Off和Blend SrcAlpha OneMinusSrcAlpha前面都已经说过了，这里不再赘述了

输入输出结构体和顶点着色器不用更改，直接看关键的片元着色器：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;

    half4 texColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);

    half3 albedo = texColor.rgb * _Color.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;
    half lambert = saturate(dot(normalWS, lightDirWS));
    half3 diffuse = mainLight.color * albedo * lambert;

    half3 finalColor = ambient + diffuse;

    return half4(finalColor, texColor.a * _AlphaScale);
}
```

去掉了原来的clip函数，然后设置了该片元着色器返回值的A通道，它是纹理像素的透明通道与材质参数_AlphaScale的乘积。

完整代码：

```shaderlab
Shader "Unlit/AlphaBlend"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _AlphaScale ("Alpha Scale", Range(0, 1)) = 1
    }
    SubShader
    {
        Tags {
            "RenderPipeline" = "UniversalPipeline"
            "Queue" = "Transparent"
            "RenderType" = "Transparent"
        }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            
            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            
            CBUFFER_START(UnityPerMaterial)
            half4 _Color;
            float4 _BaseMap_ST;
            float _AlphaScale;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv0 : TEXCOORD2;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                
                half4 texColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
                
                half3 albedo = texColor.rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half lambert = saturate(dot(normalWS, lightDirWS));
                half3 diffuse = mainLight.color * albedo * lambert;
                
                half3 finalColor = ambient + diffuse;
                
                return half4(finalColor, texColor.a * _AlphaScale);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

我们可以通过调整Alpha Scale来控制整体透明度：  
<!-- 这是一张图片，ocr 内容为： -->
![Alpha Scale: 1](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779728859017-4dacc996-88f9-4ddc-9dc8-d1a760264a56.png)<!-- 这是一张图片，ocr 内容为： -->
![Alpha Scale: 0.5](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779728877742-ff25404f-dea2-448c-b8f3-a03b79b296c4.png)<!-- 这是一张图片，ocr 内容为： -->
![Alpha Scale: 0.2](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779728902567-32c94468-d8d3-41b0-9fe9-c17e8c898565.png)

我们在之前详细解释过了由于关闭深度写入后带来的各种问题，当模型本身有复杂的遮挡关系或是包含了复杂的非凸网格的时候，就会有各种各样因为排序错误而产生的错误透明效果，如下图：

<!-- 这是一张图片，ocr 内容为： -->
![用上面的Shader渲染Knot模型得到的效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779729801444-d5645570-2482-4dc5-a4c2-c5d297f156c4.png)

这都是由于我们关闭了深度写入造成的，因为这样我们就无法对模型进行像素级别的深度排序。在之前我们提到了一种解决方法是分割网络，从而得到一个质量优等的网格，但是很多情况下这往往是不切实际的。这时，我们可以想办法重新利用深度写入，让模型可以像半透明物体一样淡入淡出。

# 开启深度写入的半透明效果
一种解决方法是使用两个Pass来渲染模型，第一个Pass开启深度写入，但不输出颜色，它的目的仅仅是为了把该模型的深度值写入深度缓冲，第二个Pass进行正常的透明度混合，由于上一个Pass已经得到了逐像素的正确的深度信息，该Pass就可以按照像素级别的深度排序结果进行透明渲染。通俗的讲就是，通过第一个Pass我们得到每个像素的深度缓冲，也就是这个模型中在该像素离摄像机最近的距离，在第二个Pass中对这些深度缓冲进行深度测试，这样就可以在一个模型内部实现像不透明物体一样的渲染效果，前面遮挡住后面的。但这种方法的缺点在于，多使用一个Pass会对性能造成一定影响。

我们只需要在透明度混合的代码中的Pass前面额外加入一个Pass

```shaderlab
SubShader
{
    Tags {
        "RenderPipeline" = "UniversalPipeline"
        "Queue" = "Transparent"
        "RenderType" = "Transparent"
    }
    Pass
    {
        ZWrite On
        ColorMask 0
    }
    Pass
    {
        Tags { "LightMode" = "UniversalForward" }

        ZWrite Off
        Blend SrcAlpha OneMinusSrcAlpha
```

这个Pass中启用的深度写入，但使用ColorMask 0禁止了颜色写入。

需要注意的是，如果不填写LightMode标签，默认为SRPDefaultUnlit，指明这个Pass不受光照影响，也就是说使用GetMainLight无法获得光线信息。

:::info
ColorMask RGBA | 0

ColorMask后面跟的值可以是RGBA四个通道的任意组合，意思是只在颜色缓冲中写入哪些通道的值，如果写0意味着禁用颜色写入。

:::

但是这时候，我们发现，在我们加了这个简单的Pass之后，不再兼容SRP Batcher了，这是SRP Batcher要求每个Pass都必须包含HLSL代码并遵循cbuffer规则，一个空Pass会被视为不兼容SRP Bathcer

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779767993718-a7766d29-3efd-4f0d-bff3-efcb63e6c328.png)

所以我们需要在第一个Pass中加入完整的HLSL代码：

```shaderlab
Pass
{
    Tags { "LightMode" = "SRPDefaultUnlit"}

    ZWrite On
    ColorMask 0

    HLSLPROGRAM
    #pragma vertex vert
    #pragma fragment frag

        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

    struct Attributes
    {
        float4 positionOS : POSITION;
    };
    struct Varyings
    {
        float4 positionHCS : SV_POSITION;
    };

    Varyings vert(Attributes IN)
    {
        Varyings OUT;
        VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
        OUT.positionHCS = positionInputs.positionCS;
        return OUT;
    }
    half4 frag(Varyings IN) : SV_TARGET
    {
        return 0;
    }
    ENDHLSL
}
```

不进行任何处理，让片元着色器直接返回0

完整代码：

```shaderlab
Shader "Unlit/AlphaBlendZWrite"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _AlphaScale ("Alpha Scale", Range(0, 1)) = 1
    }
    SubShader
    {
        Tags {
            "RenderPipeline" = "UniversalPipeline"
            "Queue" = "Transparent"
            "RenderType" = "Transparent"
        }
        Pass
        {
           Tags { "LightMode" = "SRPDefaultUnlit"}
            
            ZWrite On
            ColorMask 0
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            
            struct Attributes
            {
                float4 positionOS : POSITION;
            };
            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                return OUT;
            }
            half4 frag(Varyings IN) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            
            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            
            CBUFFER_START(UnityPerMaterial)
            half4 _Color;
            float4 _BaseMap_ST;
            float _AlphaScale;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv0 : TEXCOORD2;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                
                half4 texColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
                
                half3 albedo = texColor.rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half lambert = saturate(dot(normalWS, lightDirWS));
                half3 diffuse = mainLight.color * albedo * lambert;
                
                half3 finalColor = ambient + diffuse;
                
                return half4(finalColor, texColor.a * _AlphaScale);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

用这种方法，我们仍可以实现模型与它后面的背景混合的效果，且模型内部之间不会有任何真正的半透明效果。

<!-- 这是一张图片，ocr 内容为： -->
![开启深度写入的半透明效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779730798156-4885b8e7-379a-480c-99f9-fab95e9a0966.png)

# ShaderLab的混合指令
我们已经看到了如何利用Blend命令进行混合。实际上，混合还有很多其他用处，不仅仅是用于透明度混合。

我们首先来看一下混合是如何实现的。当片元着色器产生一个颜色的时候，可以选择与颜色缓冲中的颜色进行混合，这样一来，混合就和两个操作数有关：源颜色（source color）和目标颜色（destination color）。源颜色，我们使用$S$表示，指的是由片元着色器产生的颜色值；目的颜色，我们使用$D$来表示，指的是从颜色缓冲中读取到的颜色值。对他们进行混合后得到的输出颜色，我们用$O$表示，它会重新写入到颜色缓冲中的。需要注意的是，当我们谈及混合中的源颜色、目的颜色和输出颜色时，它们都包含了RGBA四个通道的值，而并非仅仅是RGB通道。

## 混合等式和参数
混合是一个逐片元操作，而且是不可编程的，但却是高度可配置的。

现在，我们已知两个操作数：源颜色$S$和目标颜色$D$，想要得到输出颜色$O$就必须使用一个等式来计算。我们把这个等式称为混合等式（blend equation）。当进行混合时，我们需要使用两个混合等式：一个用于混合RGB通道，一个用于混合A通道。当设置混合状态时，我们实际上设置的就是混合等式中的操作和因子，在默认情况下，混合等式使用的操作都是加操作（我们也可以使用其他操作），我们只需要再设置一下混合因子即可。由于需要两个等式（分别用于混合RGB通道和A通道），每个等式有两个因子（一个用于和源颜色相乘，一个用于和目标颜色相乘），因此一共需要4个因子。下面给出ShaderLab中的两种设置混合因子的命令：

| 命令 | 描述 |
| --- | --- |
| Blend SrcFactor DstFactor | 开启混合，并设置混合因子。源颜色（该片元产生的颜色）会乘以SrcFactor，而目标颜色（已经存在于颜色缓冲中的颜色）会乘以DstFactor，然后把两者相加后再存入颜色缓冲中。 |
| Blend SrcFactor DstFactor, SrcFactorA DstFactorA | 和上面几乎一样，只是使用不同的因子来单独混合透明通道 |


可以发现，第一个命令只提供了两个因子，这意味着将使用同样的混合因子来混合RGB通道和A通道，等价于Blend SrcFactor DstFactor, SrcFactor DstFactor。下面是使用这四个因子进行加法混合时使用的混合公式：

$$O_{rgb}=SrcFactor×S_{rgb}+DstFactor×D_{rgb}$$

$$O_{a}=SrcFactorA×S_{a}+DstFactorA×D_{a}$$

那么，这些混合因子可以有哪些值呢？下表给出ShaderLab支持的几种混合因子：

| 参数 | 描述 |
| --- | --- |
| One | 因子为1 |
| Zero | 因子为0 |
| SrcColor | 因子为源颜色。当用于混合RGB通道的混合等式时，使用SrcColor的RGB分量作为混合因子；当用于混合A通道的混合等式时，使用SrcColor的A分量作为混合因子 |
| SrcAlpha | 因子为源颜色的透明度值（A通道） |
| DstColor | 因子为目标颜色。当用于混合RGB通道的混合等式时，使用DstColor的RGB分量作为混合因子；当用于混合A通道的混合等式时，使用DstColor的A分量作为混合因子 |
| DstAlpha | 因子为目标颜色的透明度值（A通道） |
| OneMinusSrcColor | 因子为（1-源颜色）。当用于混合RGB通道的混合等式时，使用结果的RGB分量作为混合因子；当用于混合A通道的混合等式时，使用结果的A分量作为混合因子 |
| OneMinusSrcAlpha | 因子为（1-源颜色的透明度值） |
| OneMinusDstColor | 因子为（1-目标颜色）。当用于混合RGB通道的混合等式时，使用结果的RGB分量作为混合因子；当用于混合A通道的混合等式时，使用结果的A分量作为混合因子 |
| OneMinusDstAlpha | 因子为（1-目标颜色的透明度值） |


如果我们希望可以使用不同的参数混合RGB和A通道时，可以使用第二个命令Blend SrcFactor DstFactor, SrcFactorA DstFactorA。例如，如果我们想要在混合后，输出颜色的透明度就是源颜色的透明度，可以使用下面的命令：

```shaderlab
Blend SrcAlpha OneMinusSrcAlpha, One Zero
```

对源颜色的A通道乘1，对目标颜色的A通道乘0，就会实现所有的颜色混合后的透明度都是源颜色的透明度。

## 混合操作
在之前涉及的混合等式中，当把源颜色和目标颜色与它们相应的混合因子相乘后，我们都是把它们的结果加起来作为输出颜色的，那么可不可以选择不使用假发，而使用减法呢？答案是肯定的，可以使用ShaderLab的BlendOp BlendOperation命令，即混合操作命令，比如使用减法可以这么写：

```shaderlab
Blend SrcAlpha OneMinusSrcAlpha
BlendOp Sub
```

下面给出了ShaderLab中支持的基础混合操作：

| 操作 | 描述 |
| --- | --- |
| Add | 默认的混合操作，将混合的源颜色与目标颜色相加。<br/>$O_{rgb}=SrcFactor×S_{rgb}+DstFactor×D_{rgb}$<br/>$O_{a}=SrcFactorA×S_{a}+DstFactorA×D_{a}$ |
| Sub | 用混合后的源颜色减去混合后的目标颜色。<br/>$O_{rgb}=SrcFactor×S_{rgb}-DstFactor×D_{rgb}$<br/>$O_{a}=SrcFactorA×S_{a}-DstFactorA×D_{a}$ |
| RevSub | 用混合后的目标颜色减去混合后的源颜色。<br/>$O_{rgb}=DstFactor×D_{rgb}-SrcFactor×S_{rgb}$<br/>$O_{a}=DstFactorA×D_{a}-SrcFactorA×S_{a}$ |
| Min | 使用源颜色和目标颜色中较小的值，是逐分量比较的。<br/>$O_{rgba}=(min(S_r,D_r),min(S_g,D_g),min(S_b,D_b),min(S_a,D_a))$ |
| Max | 使用源颜色和目标颜色中较大的值，是逐分量比较的。<br/>$O_{rgba}=(max(S_r,D_r),max(S_g,D_g),max(S_b,D_b),max(S_a,D_a))$ |


混合操作命令通常是与混合混合因子命令一起工作的，但需要注意的是，当使用Min和Max混合操作时，混合因子实际上是不起任何作用的，它们仅会判断原始的源颜色和目的颜色之间的比较结果。

除了以上基础混合操作，还有两类混合操作，分别是逻辑混合操作（Logical Operations）和高级混合操作（Advanced Operations），这些混合操作都有一些限制和条件，这里不再说明，感兴趣可以自行搜索。

## 常见的混合类型
**正常（Normal）**

```shaderlab
Blend SrcAlpha OneMinusSrcAlpha
```

$$O_{rgba}=SrcFactor×S_{rgba}+DstFactor×D_{rgba}$$

用于透明度混合



**柔和相加（Soft Additive）**

```shaderlab
Blend OneMinusDstColor one
```

$$O_{rgba}=(1-D_{rgba})×S_{rgba}+D_{rgba}$$

在目标颜色的基础上，添加以补位颜色为因子混合后的源颜色，形成柔和颜色，避免过曝，常用于光晕



**正片叠底（Multiply）**

```shaderlab
Blend DstColor Zero
```

$$O_{rgba}=D_{rgba}×S_{rgba}+0×D_{rgba}=D_{rgba}×S_{rgba}$$

即相乘，颜色相乘变暗，适合用于阴影染色。



**两倍相乘（2x Multiply）**

```shaderlab
Blend DstColor SrcColor
```

$$O_{rgba}=D_{rgba}×S_{rgba}+S_{rgba}×D_{rgba}=2×D_{rgba}×S_{rgba}$$

比正片叠底更亮的效果。



**变暗（Darken）**

```shaderlab
BlendOp Min
Blend One One
```

$$O_{rgba}=(min(S_r,D_r),min(S_g,D_g),min(S_b,D_b),min(S_a,D_a))$$

混合分量最小值，使颜色变暗。



**变亮（Lighten）**

```shaderlab
BlendOp Max
Blend One One
```

$$O_{rgba}=(max(S_r,D_r),max(S_g,D_g),max(S_b,D_b),max(S_a,D_a))$$

混合分量最大值，使颜色变亮。



**滤色（Screen）**

```shaderlab
Blend OneMinusDstColor One
// 等同于
Blend One OneMinusSrcColor
```

$$O_{rgba}=(1-D_{rgba})×S_{rgba}+D_{rgba}$$

$$O_{rgba}=S_{rgba}+(1-S_{rgba})×D_{rgba}$$

第一种与柔和相加一样。与正片叠底相反，结果总比原色更亮。



**线性减淡（Linear Dodge）**

```shaderlab
Blend One One
```

$$O_{rgba}=S_{rgba}+D_{rgba}$$

加法混合，颜色叠加变亮，用于发光、火焰等效果

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779734866897-20bfc1a3-e9cd-4ef4-8585-a4a49e1fbf36.png)

# 双面渲染的透明效果
在现实生活中，如果一个物体是透明的，意味着我们不仅可以透过它看到其他物体的样子，也可以看到它内部的结构。但在前面实现的透明效果中，无论是透明度测试和透明度混合，我们都无法观察到正方体内部及其背面的形状，导致物体看起来就好像只有半个一样。这是因为，默认情况下渲染引擎剔除了物体背面（相对于摄像机方向）的渲染图元，而之渲染了物体的正面。如果我们想要得到双面渲染的效果，可以使用Cull指令来控制需要剔除哪个面的渲染图元。

:::info
Cull Back | Front | Off

剔除背后|前面|不剔除，默认设置为Cull Back

:::

如果设置为Back，那么那些背对于摄像机的渲染图元就不会被渲染，这也是默认情况下的剔除状态；如果设置为Front，那么那些朝向摄像机的渲染图元就不会被渲染；如果设置为Off，就会关闭剔除功能，所有图元都会被渲染，但由于这时需要渲染的图元数目会成倍增加，因此除非是用于特殊情况，例如这里的双面渲染的透明效果，通常情况下是不会关闭剔除功能的。

## 透明度测试的双面渲染
在透明度测试的代码的基础上仅添加了一行代码：

```shaderlab
Pass
{
    Tags { "LightMode" = "UniversalForward" }

    Cull Off
```

如上所示，加了一行Cull Off，用于关闭剔除功能，使得所有渲染图元都会被渲染。

完整代码：

```shaderlab
Shader "Unlit/AlphaTestBothSided"
{
   Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _MainTex ("Main Tex", 2D) = "white" {}
        _Cutoff ("Alpha Cutoff", Range(0, 1)) = 0.5
    }
    SubShader
    {
        Tags {
            "RenderPipeline" = "UniversalPipeline"
            "Queue" = "AlphaTest"
            "RenderType" = "TransparentCutout"
        }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            
            Cull Off
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            
            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);
            
            CBUFFER_START(UnityPerMaterial)
            half4 _Color;
            float4 _MainTex_ST;
            float _Cutoff;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS : NORMAL;
                float4 texcoord : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS: SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv : TEXCOORD2;
            };
            
            Varyings vert (Attributes v)
            {
                Varyings o;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(v.positionOS.xyz);
                o.positionCS = positionInputs.positionCS;
                o.positionWS = positionInputs.positionWS;
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                o.uv = TRANSFORM_TEX(v.texcoord, _MainTex);
                return o;
            }

            half4 frag (Varyings i) : SV_Target
            {
                Light mainLight = GetMainLight();
                float3 normalWS = normalize(i.normalWS);
                float3 lightDirWS = mainLight.direction;
                
                half4 texColor = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv);
                clip(texColor.a - _Cutoff);
                
                half3 albedo = texColor.rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half3 diffuse = mainLight.color * albedo * saturate(dot(normalWS, lightDirWS));
                
                half3 color = ambient + diffuse;
                
                return half4(color, 1.0);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

此时，我们可以透过正方体的镂空区域看到内部的渲染结果。

<!-- 这是一张图片，ocr 内容为： -->
![透明度测试的双面渲染](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779735587518-1e77a1c5-38ba-4c3e-b67f-b7b44341cf38.png)

## 透明度混合的双面渲染
与透明度测试相比，想让透明度混合实现双面渲染会更复杂一些，这是因为透明度混合需要关闭深度写入，这时我们就需要小心地控制渲染顺序来得到正确的深度关系。如果我们直接像上面的做法一样关闭剔除功能的话，我们无法保证同一个物体的正面和背面图元的渲染顺序，就有可能得到错误的半透明效果。

为此，我们选择把双面渲染的工作分成两个Pass，第一个Pass只渲染背面，第二个Pass只渲染正面，由于Unity会顺序执行SubShader中的各个Pass，因此我们可以保证背面总是在正面被渲染之前渲染，从而可以保证正确的深度渲染关系。

我们直接复制透明度混合中的Pass，分别在两个Pass中加入Cull Front和Cull Back，来实现先后渲染。

这里我们需要注意的是，在URP中同样的LightMode标签，只会执行第一个。这样我们该怎么让两个Pass都能获取光照呢，这里我们使用一个取巧的方法，让第一个Pass使用UniversalForwardOnly，这个跟UniversalForward相同，区别只是无法在延迟渲染中使用，而UniversalForward都可以。

这里直接给出完整代码：

```shaderlab
Shader "Unlit/AlphaBlendBothSided"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _AlphaScale ("Alpha Scale", Range(0, 1)) = 1
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "Queue" = "Transparent"
            "RenderType" = "Transparent"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        
        CBUFFER_START(UnityPerMaterial)
            half4 _Color;
            float4 _BaseMap_ST;
            float _AlphaScale;
        CBUFFER_END

        struct Attributes
        {
            float4 positionOS: POSITION;
            float3 normalOS : NORMAL;
            float4 uv0 : TEXCOORD0;
        };

        struct Varyings
        {
            float4 positionHCS: SV_POSITION;
            float3 normalWS : TEXCOORD0;
            float3 positionWS : TEXCOORD1;
            float2 uv0 : TEXCOORD2;
        };

        Varyings vert(Attributes IN)
        {
            Varyings OUT;
            VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
            OUT.positionHCS = positionInputs.positionCS;
            OUT.positionWS = positionInputs.positionWS;
            VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
            OUT.normalWS = normalInputs.normalWS;
            OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
            return OUT;
        }

        half4 frag(Varyings IN) : SV_Target
        {
            Light mainLight = GetMainLight();
            half3 normalWS = normalize(IN.normalWS);
            half3 lightDirWS = mainLight.direction;
                
            half4 texColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
                
            half3 albedo = texColor.rgb * _Color.rgb;
            half3 ambient = SampleSH(normalWS) * albedo;
            half lambert = saturate(dot(normalWS, lightDirWS));
            half3 diffuse = mainLight.color * albedo * lambert;
                
            half3 finalColor = ambient + diffuse;
                
            return half4(finalColor, texColor.a * _AlphaScale);
        }
        ENDHLSL

        Pass
        {

            Tags { "LightMode" = "UniversalForwardOnly" }

            Cull Front

            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            ENDHLSL
        }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }

            Cull Back

            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

可以注意到，这次的代码与之前变化很大，这是因为这里因为我们两个Pass的内容基本上是一致的，我们可以使用HLSLINCLUDE和ENDHLSL在Pass外包裹一片区域，在里面所写的引用、变量和结构体可以自动补充在每个Pass当中，可以理解为公用区域，这样可以使代码更加简洁。

<!-- 这是一张图片，ocr 内容为： -->
![透明度混合的双面渲染](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779852733535-08eb2bb4-69b3-43c0-af0a-bccfdded2ac6.png)

