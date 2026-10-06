---
title: '第十一章 让画面动起来'
date: 2026-10-05
updated: 2026-10-05
categories: UnityShader入门精要-URP改编
cover: https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251204051842_bg-blog7.jpg
tags:
  - Shaderlab
  - TA
  - 图形学
top: 1
---

没有动画的画面往往让人感觉很无趣。在本章中，我们将学会如何向Unity Shader中引入时间变量，以实现各种动画效果。

# Unity Shader中的内置变量（时间篇）
动画效果往往都是把时间添加到一些变量的计算中，以便在时间变化时画面也可以随之变化。Unity Shader提供了一系列关于时间的内置变量来允许我们方便地在Shader中访问运行时间，实现各种动画效果。

| **名称** | **类型** | **描述** |
| --- | --- | --- |
| _Time | float4 | t 是自场景加载开始所经过的时间，4 个分量的值分别是(t/20, t, 2t, 3t) |
| _SinTime | float4 | t 是时间的正弦值，4 个分量的值分别是(t/8, t/4, t/2, t) |
| _CosTime | float4 | t 是时间的余弦值，4 个分量的值分别是(t/8, t/4, t/2, t) |
| unity_DeltaTime | float4 | dt 是时间增量，4 个分量的值分别是(dt, 1/dt, smoothDt, 1/smoothDt) |


# 纹理动画
纹理动画在游戏中的应用非常广泛。尤其是在各种资源都比较局限的移动平台上，我们往往会使用纹理动画来代替复杂的粒子系统等模拟各种动画效果。

## 序列帧动画
最常见的纹理动画之一就是序列帧动画。序列帧动画的原理非常简单，它像放电影一样，依次播放一系列关键帧图像，当播放速度达到一定数值时，看起来就是一个连续的动画。它的优点在于灵活性很强，我们不需要进行任何物理计算就可以得到非常细腻的动画效果，而它的缺点也很明显，由于序列帧中每张关键帧图像都不一样，因此要制作一张出色的序列帧纹理所需要的美术工程量也比较大。

要想实现序列帧动画，我们先要提供一张包含了关键帧图像的图像，在本书资源中提供了一张图像，如下图：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785993932360-fed9c6d3-bf3a-469d-86be-561c40bf1d9d.png)

上述图像包含了 8 x 8 张关键帧图像，它们的大小相同，而且播放顺序为从左到右、从上到下。

接下来，我们要在Unity中使用Shader实现序列帧动画：

新建一个Shader并创建一个材质命名为ImageSequenceAnimationMat。

上述序列帧动画的精髓在于，我们需要在每个时刻计算该时刻下应该播放的关键帧的位置，并对该关键帧进行纹理采样。

我们首先声明了多个属性，以设置该序列帧动画的相关参数：

```shaderlab
Properties
{
    [Header(Texture)] [Space(5)]
    [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
    [MainTexture] _BaseMap("基础纹理", 2D) = "white" {}

    [Header(Properties)] [Space(5)]
    _HorizontalAmount ("水平关键帧数量", Float) = 8
    _VerticalAmount ("垂直关键帧数量", Float) = 8
    _Speed ("动画速度", Range(1, 100)) = 30
}
```

_BaseMap就是包含了所有关键帧图像的纹理，_HorizontalAmount和_VerticalAmount分别代表了该图像在水平方向和竖直方向包含的关键帧图像的个数。而_Speed属性用于控制序列帧动画的播放速度。

由于序列帧图像通常是透明纹理（黑色表示透明），我们需要设置Pass的相关状态，以渲染透明效果：

```shaderlab
SubShader
{  
    Tags
    {
        "RenderPipeline" = "UniversalPipeline"
        "RenderType" = "Transparent"
        "Queue" = "Transparent"
    }
    Pass
    {
        Tags
        {
            "LightMode" = "UniversalForward"
        }
        ZWrite Off
        Blend SrcAlpha OneMinusSrcColor
    }
}
```

由于序列帧图像通常包含了透明通道，因此可以被当成是一个半透明对象。在这里我们使用半透明的“标配”来设置它的SubShader标签，即把Queue和RenderType设置成Transparent。在Pass中，我们使用了Blend命令来开启并设置混合模式，同时关闭了深度写入。

顶点着色器的代码非常简单， 我们进行了基本的顶点变换，并把顶点的纹理坐标存储到了输出结构体中。

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionHCS = positionInputs.positionCS;
    OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
    return OUT;
}
```

片元着色器是我们的重头戏：

```shaderlab
half4 frag(Varyings IN) : SV_Target
{
    half time = floor(_Time.y * _Speed);
    half row = floor(time / _HorizontalAmount);
    half colume = time - row * _HorizontalAmount;

    half2 uv = half2(IN.uv.x / _HorizontalAmount, IN.uv.y / _VerticalAmount);
    uv.x += colume / _HorizontalAmount;
    uv.y -= row / _VerticalAmount;
    half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv);

    half3 finalColor = baseMap.rgb * _BaseColor.rgb;
    return half4(finalColor, baseMap.a);
}
```

要播放序列帧动画，从本质来说，我们需要计算出每个时刻需要播放的关键帧在纹理中的位置。而由于序列帧纹理都是按行按列排列的，因此这个设置可以认为是该关键帧所在的行列索引数。因此在上面的代码的前 3 行中我们计算了行列数，其中使用了Unity的内置时间变量_Time。由前面所知，_Time.y就自该场景加载后所经过的时间。我们首先把_Time.y和速度属性_Speed相乘得到模拟的时间，并使用floor函数对结果值取整数来得到整数时间time。然后，我们使用time除以_HorizontalAmount的结果值的商来作为当前对应的行索引，除法结果的余数则是列索引。接下来，我们需要使用行列索引值来构建真正的采样坐标。

由于序列帧图像包含了许多关键帧图像，这意味着采样坐标需要映射到每个关键帧图像的坐标范围内。我们可以首先把原纹理`IN.uv`按行数和列数进行等分，得到每个子图像的纹理坐标范围，然后，我们需要使用当前的行列数对上面的结果进行偏移，得到当前图像的纹理坐标。需要注意的是，对竖直方向的坐标偏移需要使用减法，这是因为Unity中纹理坐标的原点在左下角，从下到上是逐渐递增的，而序列帧中从下到上是递减的。

我们还可以对上述过程中的除法整合在一起，改为以下代码（除法的性能消耗很高）：

```shaderlab
half2 uv = IN.uv + half2(colume, -row);
uv.x /= _HorizontalAmount;
uv.y /= _VerticalAmount;

half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv);
```

完整代码：

```shaderlab
Shader "Custom/ImageSequenceAnimation"
{
    Properties
    {
        [Header(Texture)] [Space(5)]
        [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
        [MainTexture] _BaseMap("基础纹理", 2D) = "white" {}
        
        [Header(Properties)] [Space(5)]
        _HorizontalAmount ("水平关键帧数量", Float) = 8
        _VerticalAmount ("垂直关键帧数量", Float) = 8
        _Speed ("动画速度", Range(1, 100)) = 30
    }

    SubShader
    {  
       Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);

        CBUFFER_START(UnityPerMaterial)
        half4 _BaseColor;
        float4 _BaseMap_ST;
        half _HorizontalAmount;
        half _VerticalAmount;
        half _Speed;
        CBUFFER_END
        
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            ZWrite Off
            Blend SrcAlpha OneMinusSrcColor
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half time = floor(_Time.y * _Speed);
                half row = floor(time / _HorizontalAmount);
                half colume = time - row * _HorizontalAmount;
                
                half2 uv = IN.uv + half2(colume, -row);
                uv.x /= _HorizontalAmount;
                uv.y /= _VerticalAmount;
                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv);
                
                half3 finalColor = baseMap.rgb * _BaseColor.rgb;
                return half4(finalColor, baseMap.a);
            }
            ENDHLSL
        }
    }
}

```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1786020511152-5ccd83b2-4e12-4702-a0f2-fb7e760b982c.gif)

## 滚动的背景
很多2D游戏都使用了不断滚动的背景来模拟游戏角色在场景中的穿梭，这些背景往往包含了多个层（layers）来模拟一种视差效果。而这些背景的实现往往就是利用了纹理动画。在本节中，我们将实现一个包含了两层的无限滚动的2D游戏背景。本节使用的纹理资源均来自于OpenGameArt网站。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1786317553400-82493e6e-c607-4023-a654-68e2ec5effcd.png)<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1786317566642-3c58d46c-6081-48bf-86bd-338f82e727e8.png)

新建一个场景，创建一个四边形Quad，调整它的大小和位置。新建一个Shader和材质。

我们首先声明新的属性：

```shaderlab
Properties
{
    [Header(Texture)] [Space(5)]
    [MainColor] [HDR] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
    [MainTexture] _BaseMap("远处背景", 2D) = "white" {}
    _DetailMap ("近处背景", 2D) = "white" {}

    [Header(Properties)] [Space(5)]
    _FarScrollSpeed ("远处背景滚动速度", Float) = 1
    _NearScrollSpeed ("近处背景滚动速度", Float) = 1
}
```

_BaseMap和_DetailMap分别是第一层（远处）和第二层（近处）的背景纹理，而_FarScrollSpeed和_NearScrollSpeed对应了各自的水平滚动速度。这里_BaseColor使用了HDR，为了是方便控制纹理整体亮度。

我们的顶点着色器非常简单：

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionHCS = positionInputs.positionCS;
    OUT.uv.xy = TRANSFORM_TEX(IN.uv, _BaseMap) + frac(float2(_FarScrollSpeed, 0) * _Time.y);
    OUT.uv.zw = TRANSFORM_TEX(IN.uv, _DetailMap) + frac(float2(_NearScrollSpeed, 0) * _Time.y);
    return OUT;
}
```

我们首先进行了最基本的顶点变换，把顶点从模型空间变换到裁剪空间。然后，我们计算了两层背景纹理的纹理坐标。为此，我们首先使用了TRANSFORM_TEX来得到初始的纹理坐标，然后，我们利用内置的_Time.y变量在水平方向上对纹理坐标进行偏移，以此达到滚动的效果。我们把两张纹理的纹理坐标存储在同一个变量OUT.uv中，以减少占用的插值寄存器空间。

片元着色器的工作就相对比较简单了：

```shaderlab
half4 frag(Varyings IN) : SV_Target
{
    half4 farLayer = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv.xy);
    half4 nearLayer = SAMPLE_TEXTURE2D(_DetailMap, sampler_DetailMap, IN.uv.zw);

    half3 finalColor = lerp(farLayer.rgb, nearLayer.rgb, nearLayer.a);
    finalColor *= _BaseColor.rgb;
    return half4(finalColor, 1);
}
```

我们首先使用了两个纹理坐标对两个背景纹理分别进行采样。然后使用第二层，也就是近处纹理的透明通道来混合两张纹理，这使用了插值lerp函数。最后使用基础颜色参数和输出颜色进行相乘，以调整背景色调。

完整代码：

```shaderlab
Shader "Custom/ScrollingBackGround"
{
    Properties
    {
        [Header(Texture)] [Space(5)]
        [MainColor] [HDR] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
        [MainTexture] _BaseMap("远处背景", 2D) = "white" {}
        _DetailMap ("近处背景", 2D) = "white" {}
        
        [Header(Properties)] [Space(5)]
        _FarScrollSpeed ("远处背景滚动速度", Float) = 1
        _NearScrollSpeed ("近处背景滚动速度", Float) = 1
    }

    SubShader
    {  
       Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        TEXTURE2D(_DetailMap);
        SAMPLER(sampler_DetailMap);

        CBUFFER_START(UnityPerMaterial)
        half4 _BaseColor;
        float4 _BaseMap_ST;
        float4 _DetailMap_ST;
        
        half _FarScrollSpeed;
        half _NearScrollSpeed;
        CBUFFER_END
        
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float4 uv : TEXCOORD0;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.uv.xy = TRANSFORM_TEX(IN.uv, _BaseMap) + frac(float2(_FarScrollSpeed, 0) * _Time.y);
                OUT.uv.zw = TRANSFORM_TEX(IN.uv, _DetailMap) + frac(float2(_NearScrollSpeed, 0) * _Time.y);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half4 farLayer = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv.xy);
                half4 nearLayer = SAMPLE_TEXTURE2D(_DetailMap, sampler_DetailMap, IN.uv.zw);
                
                half3 finalColor = lerp(farLayer.rgb, nearLayer.rgb, nearLayer.a);
                finalColor *= _BaseColor.rgb;
                return half4(finalColor, 1);
            }
            ENDHLSL
        }
    }
}

```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1786317530340-87b1e1d2-1b80-4b74-bb1b-5bfbfb78f0c0.gif)

# 顶点动画
如果一个游戏中所有的物体都是静止的，这样枯燥的世界恐怕很难引起玩家的兴趣。顶点动画可以让我们的场景变得更加生动有趣。在游戏中，我们常常使用顶点动画来模拟飘动的旗帜、湍流的小溪等效果。在本节中，我们将学习两种常见的顶点动画的应用——流动的河流以及广告牌技术。

## 流动的河流
河流的模拟是顶点动画最常见的应用之一。它的原理通常就是使用正弦函数等来模拟水流的波动效果。在本小节中，我们将学习如何模拟一个2D的河流效果。

首先，我们声明了一些新的属性：

```shaderlab
Properties
{
    [Header(Texture)] [Space(5)]
    [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
    [MainTexture] _BaseMap("基础纹理", 2D) = "white" {}

    [Header(Properties)] [Space(5)]
    _Magnitude ("水流波动幅度", Float) = 1
    _Frequency ("水流波动频率", Float) = 1
    _InvWaterLength ("水流波长的倒数", Float) = 10
    _Speed ("水流速度", Float) = 0.5
}
```

其中，_BaseMap是河流纹理，_BaseColor用于控制整体颜色，_Magnitude用于控制水流波动的幅度，_Frequency用于控制波动频率，_InvWaterLength用于控制波长的倒数（_InvWaterLength越大，波长越小），_Speed用于控制河流纹理的移动速度。

然后设置为透明队列：

```shaderlab
SubShader
{  
    Tags
    {
        "RenderPipeline" = "UniversalPipeline"
        "RenderType" = "Transparent"
        "Queue" = "Transparent"
    }
}
```

接着，我们设置了Pass的渲染状态：

```shaderlab
Pass
{
    Tags
    {
        "LightMode" = "UniversalForward"
    }
    ZWrite Off
    Blend SrcAlpha OneMinusSrcColor
    Cull Off
}
```

这里关闭了剔除功能，是为了让水流的每个面都能显示。

然后我们在顶点着色器中进行了相关的顶点动画：

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;

    float3 offset = float3(0, 0, 0);
    offset.x = sin(_Frequency * _Time.y + IN.positionOS.x * _InvWaterLength + IN.positionOS.y * _InvWaterLength + IN.positionOS.z * _InvWaterLength) * _Magnitude;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz + offset);
    OUT.positionHCS = positionInputs.positionCS;
    OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap) + float2(0, _Time.y * _Speed);
    return OUT;
}
```

我们首先计算了顶点偏移量。我们只希望对顶点的x方向进行偏移，因此初始都设置为0。然后我们利用_Frequency属性和内置的_Time.y变量来控制正选函数的频率。为了让不同位置具有不同的偏移，我们对上述结果加上模型空间下的位置分量，并乘以_InvWaterLength来控制波长。最后，我们对结果值乘以_Magnitude属性来控制波动幅度，得到最终的偏移。剩下的工作，我们只需要把位移量添加到顶点位置上，再进行正常的顶点变换即可。

在上面的代码中，我们还进行了纹理动画，即进行_Time.y和_Speed来控制在水平方向上的纹理动画。

片元着色器的代码非常简单，我们只需要对纹理采样再添加颜色控制即可：

```shaderlab
half4 frag(Varyings IN) : SV_Target
{
    half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv);
    half3 finalColor = baseMap.rgb * _BaseColor.rgb;
    return half4(finalColor, 1);
}
```

完整代码：

```shaderlab
Shader "Custom/Water"
{
    Properties
    {
        [Header(Texture)] [Space(5)]
        [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
        [MainTexture] _BaseMap("基础纹理", 2D) = "white" {}
        
        [Header(Properties)] [Space(5)]
        _Magnitude ("水流波动幅度", Float) = 1
        _Frequency ("水流波动频率", Float) = 1
        _InvWaterLength ("水流波长的倒数", Float) = 10
        _Speed ("水流速度", Float) = 0.5
    }

    SubShader
    {  
       Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);

        CBUFFER_START(UnityPerMaterial)
        half4 _BaseColor;
        float4 _BaseMap_ST;
        
        half _Magnitude;
        half _Frequency;
        half _InvWaterLength;
        half _Speed;
        CBUFFER_END
        
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            ZWrite Off
            Blend SrcAlpha OneMinusSrcColor
            Cull Off
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                
                float3 offset = float3(0, 0, 0);
                offset.x = sin(_Frequency * _Time.y + IN.positionOS.x * _InvWaterLength + IN.positionOS.y * _InvWaterLength + IN.positionOS.z * _InvWaterLength) * _Magnitude;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz + offset);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap) + float2(0, _Time.y * _Speed);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv);
                half3 finalColor = baseMap.rgb * _BaseColor.rgb;
                return half4(finalColor, 1);
            }
            ENDHLSL
        }
    }
}

```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1786320035383-71d94523-06a1-49ac-bc86-222fe326d5f7.gif)

## 广告牌
另一种常见的顶点动画就是广告牌技术（Billboarding）。广告牌技术会根据视角方向来旋转一个被纹理着色的多边形（通常就是简单的四边形，这个多边形就是广告牌），使得多边形看起来好像总是面对摄像机。广告牌技术被用于很多应用，比如渲染烟雾、云朵、闪光效果等。

广告牌技术的本质就是构建旋转矩阵，而我们知道一个变换矩阵需要3个基向量。广告牌技术使用的基向量通常就是表面法线（normal）、指向上的方向（up）以及指向右的方向（right）。除此之外，我们还需要指定一个锚点（anchor loction），这个锚点在旋转过程中是固定不变的，以此来确定多边形在空间中的位置。

广告牌技术的难点在于，如何根据需求来构建3个互相正交的基向量。计算过程通常是，我们首先会通过初始计算得到目标的表面法线（例如就是视角方向）和指向上的方向，而二者往往是不垂直的。但是，二者其中之一是固定的，例如当模拟草丛时，我们希望广告牌的指向上的方向永远是（0，1，0），而法线方向应该随视角变化；而当模拟粒子效果的时候，我们希望广告牌的法线方向是固定的，即总是指向视角方向，指向上的方向则可以发生变化。我们假设法线方向是固定的，首先，我们根据初始的表面法线和指向上的方向来计算出目标方向的指向右的方向（通过叉积操作）：

$$right=up×normal$$

对其归一化后，再由法线方向和指向右的方向计算出正交的指向上的方向即可：

$$up^{\prime}=normal×right$$

至此，我们就可以得到用于旋转的3个正交基了，下图给出了计算过程的图示。如果指向上的方向是固定的，计算过程也是类似的，如下公式

$$normal^{\prime}=up×right$$

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1786322730279-31c7134a-a282-476f-8863-9c19ec30640a.png)

下面我们将在Unity中实现上面提到的广告牌技术，在学习完本节后，我们可以得到下面类似效果：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1786322782250-384a2988-e5a2-455b-bffb-2478fde07120.png)

新建场景、Shader和材质，在场景中创建多个四边形（Quad），调整它们的大小和位置，把材质托给它们。这些四边形就是用于广告牌技术的广告牌。

首先声明几个新变量：

```shaderlab
Properties
{
    [Header(Texture)] [Space(5)]
    [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
    [MainTexture] _BaseMap("基础纹理", 2D) = "white" {}

    [Header(Properties)] [Space(5)]
    _VerticalBillboard ("垂直方向的程度", Range(0, 1)) = 1
}
```

其中_BaseMap是广告牌显示的透明纹理，_BaseColor用于控制显示整体颜色，_VerticalBillboard用于调整是固定法线还是固定向上的方向，即约束垂直方向的程度。

然后设置为透明队列：

```shaderlab
SubShader
{  
    Tags
    {
        "RenderPipeline" = "UniversalPipeline"
        "RenderType" = "Transparent"
        "Queue" = "Transparent"
    }
}
```

接着，我们设置了Pass的渲染状态：

```shaderlab
Pass
{
    Tags
    {
        "LightMode" = "UniversalForward"
    }
    ZWrite Off
    Blend SrcAlpha OneMinusSrcColor
    Cull Off
}
```

这里关闭了剔除功能，是为了让广告牌的每个面都能显示。

顶点着色器是我们的核心，所有的计算都是在模型空间下进行的，我们首先选择模型空间的原点作为广告牌的锚点，并利用GetCurrentViewPosition()获得世界空间下的视角位置并变换到模型空间下。

```shaderlab
float3 center = float3(0, 0, 0);
half3 viewPositionOS = TransformWorldToObject(GetCurrentViewPosition());
```

然后，我们开始计算3个正交矢量。首先，我们根据观察位置和锚点计算目标法线方向，并根据_VerticalBillboard属性来控制垂直方向上的约束度。

```shaderlab
half3 normalOS = viewPositionOS - center;
normalOS.y = normalOS.y * _VerticalBillboard;
normalOS = normalize(normalOS);
half3 upDirOS = abs(normalOS.y) > 0.999 ? half3(0, 0, 1) : half3(0, 1, 0);
half3 rightDirOS = normalize(cross(upDirOS, normalOS));
upDirOS = normalize(cross(normalOS, rightDirOS));
```

当_VerticalBillboard为1时，意味着法线保持原状，即法线方向固定为视角方向，而Up向量会随着后续计算不在为（0，1，0）；当_VerticalBillboard为0时，法线方向的Y分量变为0，意味着法线只会随着视角方向改变而左右移动，不再上下俯视，此时与Up向量（0，1，0）垂直，后续重新计算得到的Up向量也会保持不变，即向上方向固定为（0，1，0）。最后需要对其归一化。

我们还需要对初始的向上Up方向进行一些限制，为了防止在从上往下看或者从z下往上看的时候，法线方向即视角方向为（x，1，z）与Up方向平行，导致叉乘结果为0，我们需要在这种情况下，对Up方向重新设置一个值，只要与之平行皆可，这里设置为了Z轴方向。你可能会想，我们Up方向都不是向上方向，最后计算得出的结果不会出问题吧？答案是肯定会有点问题，会出现跳动现象，如下图：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1786333962235-fb4c7e87-eee5-4d03-ab1e-32fa86aa8156.gif)

然后我们根据初始的Up向量和法线向量计算出向右的方向向量并重新计算出Up向量。这样我们就得到了所需的3个正交基向量。我们根据原始的位置相对于锚点的偏移量以及3个正交基向量，以计算得到新的顶点位置：

```shaderlab
float3 centerOffset = IN.positionOS.xyz - center;
float3 positionOS = center + rightDirOS * centerOffset.x + upDirOS * centerOffset.y + normalOS * centerOffset.z;
VertexPositionInputs positionInputs = GetVertexPositionInputs(positionOS);
OUT.positionHCS = positionInputs.positionCS;
```

这里计算偏移值，完全也可以不用计算，直接使用IN.positionOS进行旋转计算，因为这里的center中心点位置为（0，0，0），如果中心点位置不在（0，0，0）就需要计算偏移了，计算偏移的过程相当于把所有点移动到以中心点为（0，0，0）的位置，计算旋转然后再移动回来。最后再把模型空间的顶点位置变换到裁剪空间中。

片元着色器的代码非常简单，我们只需要对纹理进行采样，并使用透明度混合，再与颜色值相乘即可：

```shaderlab
half4 frag(Varyings IN) : SV_Target
{
    half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv);
    half3 finalColor = lerp(0, baseMap.rgb, baseMap.a) * _BaseColor.rgb;
    return half4(finalColor, baseMap.a);
}
```

完整代码：

```shaderlab
Shader "Custom/Billboard"
{
    Properties
    {
        [Header(Texture)] [Space(5)]
        [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
        [MainTexture] _BaseMap("基础纹理", 2D) = "white" {}
        
        [Header(Properties)] [Space(5)]
        _VerticalBillboard ("垂直方向的程度", Range(0, 1)) = 1
    }

    SubShader
    {  
       Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);

        CBUFFER_START(UnityPerMaterial)
        half4 _BaseColor;
        float4 _BaseMap_ST;
        
        half _VerticalBillboard;
        CBUFFER_END
        
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            ZWrite Off
            Blend SrcAlpha OneMinusSrcColor
            Cull Off
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                
                float3 center = float3(0, 0, 0);
                half3 viewPositionOS = TransformWorldToObject(GetCurrentViewPosition());
                half3 normalOS = viewPositionOS - center;
                normalOS.y = normalOS.y * _VerticalBillboard;
                normalOS = normalize(normalOS);
                half3 upDirOS = abs(normalOS.y) > 0.999 ? half3(0, 0, 1) : half3(0, 1, 0);
                half3 rightDirOS = normalize(cross(upDirOS, normalOS));
                upDirOS = normalize(cross(normalOS, rightDirOS));
                float3 centerOffset = IN.positionOS.xyz - center;
                float3 positionOS = center + rightDirOS * centerOffset.x + upDirOS * centerOffset.y + normalOS * centerOffset.z;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(positionOS);
                OUT.positionHCS = positionInputs.positionCS;
                
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv);
                half3 finalColor = lerp(0, baseMap.rgb, baseMap.a) * _BaseColor.rgb;
                return half4(finalColor, baseMap.a);
            }
            ENDHLSL
        }
    }
}

```

_VerticalBillboard为1情况下：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1786335717565-f28455fd-30ca-4851-9307-787a4fae75d7.gif)

_VerticalBillboard为0情况下：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1786335752362-efb9bba4-079a-403d-b750-2a541336a05c.gif)

