---
title: ShaderLab
date: 2026-04-04
updated: 2026-06-11
categories: UnityShader入门精要-URP改编
tags:
  - UnityShader
  - Shaderlab
  - TA
  - 图形学
top: 1
---

在 Unity 中所有的 Unity Shader 都是通过 ShaderLab 编写的，它 Unity 提供用来编写 Unity Shader 的一种说明性语言，它使用一些嵌套在花括号内部的语义（syntax）来描述一个 Unity Shader 文件的结构。

# Unity Shader的结构
给 Shader 取一个名字

每个Unity Shader文件的第一行都需要通过`Shader`语义来指定该 Unity Shader 的名字

```shaderlab
Shader "Custom/MyShader"  //在字符中添加"/"来控制Shader在材质面板中的位置
{
	
}
```

这个 Shader 的位置就是Shader->Custom->MyShader

# Properties
材质与Unity Shader的桥梁

在`Properties`语义块中包含了一系列**属性**，这些属性将会出现在材质面板上

```shaderlab
Properties 
{
	Name("display name", PropertyType) = DefaultValue
	Name("display name", PropertyType) = DefaultValue
	//更多属性
}

```

在Unity中，这些属性的名字`Name`通常由一个下划线`_`开始，这个名字是在代码中使用的变量名字，显示的名字`display name`是出现在材质面板上的名字

我们需要为每个属性指定它的类型`PropertyType`，常见的属性见下表，除此之外还需要有个默认值`DefaultValue`

| **属性类型** | **默认值的定义语法** | **例子** |
| --- | --- | --- |
| Int | number | `_Int("Int", Int) = 2  ` |
| Float | number | `_Float("Float", Float) = 1.5` |
| Range(min, max) | number | `_Range("Range", Range(0.0, 5.0)) = 3.0` |
| Color | (number, number, number, number) | `_Color("Color", Color) = (1, 1, 1, 1)` |
| Vector | (number, number, number, number) | `_Vector("Vector", Vector) = (2, 3, 6, 1)` |
| 2D | "defaulttexture" {} | `_2D("2D", 2D) = "" {}` |
| Cude | "defaulttexture" {} | `_Cude("Cude", Cude) = "white" {}` |
| 3D | "defaulttexture" {} | `_3D("3D, 3D) = "black" {}` |


对于2D、Cude、3D这三种纹理类型，默认值的定义稍微复杂，它们的默认值是通过一个字符串后跟一个花括号来指定的，其中字符串要么是空的，要么是内置的纹理名字，如`"white"` `"black"` `"gray"` `"bump"`。花括号的作用原本是用于指定一些纹理属性，但在Unity5.0之后内置的属性被移除了，需要自己在顶点着色器中编写了

为了在Shader中访问这些属性，我们需要在HLSL代码片中定义这些属性相匹配的变量，需要说明的是，即使不再`Properties`中声明这些属性，也可以在HLSL中定义变量，所以`Properties`的作用仅仅只是让这些属性能够出现在材质面板上。

# SubShader
每个Unity Shader文件可以包含多个SubShader语义块，但最少要有一个

当Unity要加载这个Unity Shader的时候，会扫描所有的SubShader语义块，然后选择一个在目标平台能用的SubShader，如果都不支持，则使用Fallback语义指定的Unity Shader

:::info
Unity提供这个语义的原因在于，不同显卡具有不同的能力，需要适配不同的显卡做不同的优化

:::

```shaderlab
SubShader
{
	//可选的
	[Tags]

	//可选的
	[RenderSetup]

	Pass
	{
		
	}
	//其他Pass
}
```

SubShader中定义了一系列Pass以及可选的状态`[RenderSetup]`和标签`[Tags]`设置，每个Pass定义了一次完整的渲染流程，Pass越多，性能越差

状态和标签同样也能在Pass中声明，在SubShader中声明的会用于SubShader下的所有Pass，在Pass中声明只会在这个Pass中生效。

## 状态设置
SubShader中提供了一系列渲染状态的设置指令，这些指令可以设置显卡的各种状态，例如是否开启混合/深度检测等

| 状态名称 | 设置指令 | 解释 |
| --- | --- | --- |
| Cull | Cull Back/Front/Off | 设置剔除模式，剔除背面/正面/关闭剔除 |
| ZTest | ZTest Less/Greater/LEqual/GEqual/Equal/NotEqual/Always | 设置深度测试时使用的函数 |
| ZWrite | ZWrite On/Off | 开启/关闭深度写入 |
| Blend | Blend SrcFactor DstFactor | 开启并设置混合模式 |


## 标签
SubShader的标签`Tags`是一个键值对，它的键和值都是字符串类型，这些键值对是SubShader和渲染引擎之间的沟通桥梁。它们用来告诉Unity的渲染引擎，我希望该怎么样以及如何渲染这个对象

```shaderlab
Tags { "TagName1" = "Value1" "TagName2" = "Value2" }
```

SubShader的标签块支持的标签类型如下表，以下标签是SubShader标签，通用于CG与HLSL

| **标签类型** | **说明** | **例子** |
| --- | --- | --- |
| RenderPipeline | 声明此 SubShader 仅与 **通用渲染管线 (URP)** 兼容或与**高清渲染管线 (HDRP)** 兼容，不填则声明此 SubShader **不兼容** URP 和 HDRP。对于内置渲染管线的 Shader，通常就不写这个标签。 | `Tags {"RenderPipeline"="UniversalPipeline" }`<br/>`Tags {"RenderPipeline"="HDRenderPipeline" }` |
| Queue | 控制渲染顺序，指定该物体属于哪一个渲染队列，通过这种方式可以保证所有的透明物体可以在所有不透明物体后面被渲染，我们也可以自定义使用的渲染队列来控制物体的渲染顺序 | `Tags { "Queue" = "Transparent" }` |
| RenderType | 对着色器进行分类，例如这是一个不透明的着色器，或是一个透明的着色器等，这可以被用于着色器替换`Shader Replacement`功能 | `Tags { "RenderType" = "Opaque" }` |
| DisableBatching | 一些SubShader在使用Unity的批处理功能时会出现问题，例如使用了模型空间下的坐标进行顶点动画，这时可以通过该标签来直接指名是否对改SubShader使用批处理 | `Tags { "DisableBatching" = "True" }` |
| ForceNoShadowCasting | 控制使用改SubShader的物体是否会投射阴影 | `Tags { "ForceNoShadowCasting" = "True" }` |
| IgnoreProjector | 如果改标签值为`True`，那么使用该SubShader的物体将不会受Projector的影响，通常用于半透明物体 | `Tags { "IgnoreProjector" = "True" }` |
| CanUseSpriteAtlas | 当该SubShader是用于精灵`Sprites`时，将该标签设为`False` | `Tags { "CanUseSpriteAtlas" = "True" }` |
| PreviewType | 指名材质面板将如何预览该材质。默认情况下，材质将显示为一个球形，我们可以通过把该标签的值设为`Plane` `SkyBox`来改变预览类型 | `Tags { "PreviewType" = "Plane" }` |


**以上标签是仅可以在SubShader中声明的，不可以在Pass中声明**

**能在Pass中声明的标签在下条中阐述**

# Pass语义块
```shaderlab
Pass
{
	[Name]
	[Tages]
	[RenderSetup]
	//其他代码
}
```

首先，可以在Pass中定义该Pass的名称

```shaderlab
Name "MyPassName"
```

通过这个名字，我们可以使用ShaderLab的`UsePass`命令来直接使用其他Unity Shader中的Pass

```shaderlab
UsePass "MyShader/MYPASSNAME"
```

需要注意的是，由于Unity内部会把所有Pass的名称转换成大写字母，所以在使用UsePass时必须使用大写

Pass的标签：

| **标签类型** | **说明** | **例子** |
| --- | --- | --- |
| **LightMode** | 定义该Pass在Unity的渲染流水线中的角色 | `Tags { "LightMode" = "UniversalForward" }` |


除了上面的普通Pass定义外，UnityShader还支持一些特殊的Pass，以便进行代码复用或实现更复杂的效果

+ **UsePass：**如我们之前提到的一样，可以使用该命令来复用其他Unity Shader中的Pass
+ **GrabPass：**该Pass负责抓取屏幕并将结果存储在一张纹理中，以用于后续的Pass处理

:::info
**`GrabPass`** 在 URP 和 HDRP 中不被支持，如果写了会被忽略。

需要抓取屏幕纹理时，URP 使用 **Render Feature** 中的 `RenderObjects` 或直接调用 `_CameraOpaqueTexture` 来实现

:::

```shaderlab
// 在 URP 中直接声明即可在 Shader 中使用，无需 GrabPass
TEXTURE2D(_CameraOpaqueTexture);
SAMPLER(sampler_CameraOpaqueTexture);
```

# Unity的内置文件
URP中常用的内置文件：

| **文件名** | **描述** |
| --- | --- |
| **Core.hlsl** | 包含了最常使用的帮助函数、宏和结构体等 |
| Lighting.hlsl | 包含了各种内置的光照模型 |


有一些文件是即便我们没有使用`#include`指令，它们也是会被自动包含进来的

`Core.hlsl`是我们最常接触的一个包含文件，它提供了一些常用的帮助函数，我们一般都会在Pass中加入这个文件的引用，否则会有很多功能用不了。

```shaderlab
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
```

# Fallback
留一条后路

紧跟在各个SubShader语义块后面的，可以是一个Fallback指令。

它的意思是，如果上面所有的SubShader都无法运行，就是用这个最低级的Shader吧

```shaderlab
Fallback "name"
//或者
Fallback Off


// 一些URP内置的回退着色器
// 无光照着色器
Fallback "Universal Render Pipeline/Unlit"

// 简单光照着色器，Blinn-Phong非物理着色器
Fallback "Universal Render Pipeline/Simple Lit"
// 标准光照着色器，标准PRB着色器
Fallback "Universal Render Pipeline/Lit"
// 复杂光照着色器，在Lit基础上更复杂强大的着色器，支持次表面散射
Fallback "Universal Render Pipeline/Complex Lit"

// 报错渲染结果
FallBack "Hidden/Universal Render Pipeline/FallbackError"
```

:::info
实际上，Fallback还会影响阴影的投射。在渲染阴影纹理时，Unity会在每个Unity Shader中寻找一个阴影投射的Pass。通常情况下我们不需要自己专门实现一个Pass，这是因为Fallback使用的内置Shader中包含了这样一个通用的Pass。

:::



# Unity Shader的形式
```shaderlab
Shader "MyShader"
{
	Properties
	{
		// 所需的各种属性
	}
	SubShader
	{
		// 真正意义上的Shader代码会出现在这里
		// 顶点/片元着色器（Vertex/Fragment Shader）
	}
	SubShader
	{
		// 与上一个类似
	}
	Fallback Off
}

```

## 顶点/片元着色器
```shaderlab
Shader "Custom/MyShader"
{
    Properties
    {
        // 所需的各种属性
    }
    SubShader
    {
        // 针对显卡A的SubShader
        Pass
        {
            // 设置渲染状态和标签

            //开始Cg代码
            HLSLPROGRAM

            // 编译指令，这里是指定顶点和片元着色器的名字
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            // 下面写Cg
            float4 vert(float4 positionOS : POSITION) : SV_POSITION
            {
                return mul(UNITY_MATRIX_MVP, positionOS);
            }
            half4 frag() : SV_Target
            {
                return half4(1.0, 0.0, 0.0, 1.0);
            }

            ENDHLSL
            //其他设置
        }
    }

    // 回调
    Fallback "Universal Render Pipeline/Lit"
}

```

顶点/片元着色器也需要定义在`HLSLPROGRAM`和`ENDHLSL`之间，写在Pass语义块中，而非SubShader中，原因是需要我们自己去定义每个Pass需要的Shader代码。

# 顶点/片元着色器结构
## #prama
```shaderlab
#pragma vertex name
#pragma fragment name
```

其中`name`就是我们的函数名，用于告诉Unity哪个函数包含了顶点着色器代码，哪个代码包含了片元着色器代码




## vertex顶点着色器
```shaderlab
float4 vert(float4 positionOS : POSITION) : SV_POSITION
{
    return mul(UNITY_MATRIX_MVP, positionOS);
}
```

顶点着色器是驻点执行的，`vert`函数的输入`positionOS`包含了这个顶点的位置，这是通过`POSITION`语义指定的。函数返回的是一个float4类型的变量，它是该顶点在裁剪空间中的位置。

`POSITION`和`SV_POSITION`都是HLSL中的**语义（semantics）**，它们是不可省略的，这些语义将告诉系统用户需要哪些输入值，以及输出是什么

这里的`POSITION`将告诉Unity，把模型的顶点坐标填充到输入参数v中，`SV_POSITION`将告诉Unity，顶点着色器输出是裁剪空间中的顶点坐标

这个顶点着色器里面只有一行代码，这一步就是把顶点坐标从模型空间转换到裁剪空间中

`UNITY_MATRIX_MVP`矩阵是URP内置的MVP矩阵




## fragment片元着色器
```shaderlab
half4 frag() : SV_Target
{
    return half4(1.0, 0.0, 0.0, 1.0);
}
```

这里的片元着色器还没有任何输入，输出是一个half4类型的变量，并且使用了`SV_Target`语义进行限定。

`SV_Target`也是HLSL中的一个系统语义，它等同于告诉渲染器，把用户的输出颜色存储到一个渲染目标中

## 结构体拓展输入输出
现在我们想要得到模型上的每个顶点的纹理坐标和法线方向。我们需要纹理坐标来访问纹理，需要法线来计算光照，因此我们需要为顶点着色器定义一个新的输入参数，这个参数不再是一个简单的数据类型，而是一个结构体。

```shaderlab
Shader "Custom/MyShader"
{
    SubShader
    {
        Pass
        {
            HLSLPROGRAM
            
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes 
            {
                // POSITION语义告诉Unity，用模型空间的顶点坐标填充positionOS变量
                float4 positionOS : POSITION;
                // NORMAL语义告诉Unity，用模型空间的法线方向填充normalOS变量
                float3 normalOS : NORMAL;
                // TEXCOORD0语义告诉Unity，用模型的第一套纹理坐标填充uv0变量
                float4 uv0 : TEXCOORD0;
            };

            float4 vert(Attributes IN) : SV_POSITION
            {
                // 使用IN.positionOS来访问模型空间的顶点坐标
                return mul(UNITY_MATRIX_MVP, IN.positionOS);
            }
            half4 frag() : SV_Target
            {
                return half4(1.0, 0.0, 0.0, 1.0);
            }

            ENDHLSL
        }
    }

    Fallback "Universal Render Pipeline/Lit"
}

```

对于顶点着色器的输入，Unity支持的语义有：`POSITION`，`TANGENT`，`NORMAL`，`TEXCOORD0`，`TEXCOORD1`，`TEXCOORD2`，`TEXCOORD3`，`COLOR`等

填充到这些语义的数据由使用该材质的Mesh Render提供的，在每帧调用Draw Call的时候，Mesh Render组件会把它负责渲染的模型数据发送给Unity Shader。

一个模型通常包含了一组三角面片，每个三角面片由3个顶点构成，而每个顶点又包含了一些数据，例如顶点位置、法线、切线、纹理坐标、顶点颜色等，通过上面的方法，我们就可以在顶点着色器中访问顶点的这些模型数据

```shaderlab
Shader "Custom/MyShader"
{
    SubShader
    {
        Pass
        {
            HLSLPROGRAM
          
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes 
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };
            // 使用一个结构体来定义顶点着色器的输出
            struct Varyings
            {
                // SV_POSITION语义告诉Unity，positionHCS里包含了顶点在裁剪空间中的位置信息
                float4 positionHCS : SV_POSITION;
                // COLOR0语义可以用于存储颜色信息
                half3 color0 : COLOR0;
            };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = mul(UNITY_MATRIX_MVP, IN.positionOS);
                // IN.normalOS包含了顶点的法线方向，其分量范围在[-1.0, 1.0]
                // 下面的代码把分量范围映射到了[0.0, 1.0]
                // 存储到OUT.color0中传递给片元着色器
                OUT.color0 = IN.normalOS * 0.5 + half3(0.5, 0.5, 0.5);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                // 将插值后的IN.color0显示到屏幕上
                return half4(IN.color0, 1.0);
            }

            ENDHLSL
        }
    }

    Fallback "Universal Render Pipeline/Lit"
}
```

在顶点着色器的输出结构体中必须要要包含一个变量，它的语义是`SV_POSITION`，否则，渲染器将无法得到裁剪空间中的顶点坐标，

获取的顶点信息传递到片元着色器中后将会对其做插值处理，填充到每一个片元信息上

## 使用属性
```shaderlab
Shader "Custom/MyShader"
{
    Properties
    {
        // 声明一个Color类型的属性
        _Color ("Color Tint", Color) = (1.0, 1.0, 1.0, 1.0)
    }
    SubShader
    {
        Pass
        {
            HLSLPROGRAM
          
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            // 在Hlsl代码中，我们需要定义一个与属性名称和类型都匹配的变量
            half4 _Color;
          
            struct Attributes 
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };
            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                half3 color0 : COLOR0;
            };
          
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = mul(UNITY_MATRIX_MVP, IN.positionOS);
                OUT.color0 = IN.normalOS * 0.5 + half3(0.5, 0.5, 0.5);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                half3 finalColor = IN.color0;
                finalColor *= _Color.rgb;
                return half4(finalColor, 1.0);
            }

            ENDHLSL
        }
    }

    Fallback "Universal Render Pipeline/Lit"
}
```

我们在 Properties 中定义了一个属性，我们还需要在 HLSL 代码中声明一个同名同类型的变量来使用

关于 SubShader 中的属性类型与 HLSL 的变量类型之间的匹配关系如下表

| **SubShader属性类型** | **Cg变量类型** |
| --- | --- |
| Color，Vector | float4，fixed4，half4 |
| Range，Float | float，fixed，half |
| 2D | sampler2D |
| Cube | samplerCube |
| 3D | sampler3D |


还有一种变量类型，使用`uniform`关键字

例如

```shaderlab
uniform fixed4 _Color;
```

uniform 关键词是修饰变量和参数的一种修饰词，它仅仅用于提供一些关于该变量的初始值是如何指定和存储相关信息的，在 Unity Shader 中，uniform 关键词是可以省略的




# 语义
类似于SV_POSITION、POSITION、COLOR0这些的，是HLSL提供的语义，语义实际上就是赋给Shader输入和输出的字符串，并把数据输出到哪里，它们在HLSL的Shader流水线中是不可或缺的，需要注意的是，Unity并没有支持所有的语义。

Unity为了方便对模型数据的传输，对一些语义进行了特别的含义规定。例如，在顶点着色器的输入结构体`Attributes`用TEXCOORD0来描述uv0，Unity会识别TEXCOORD0语义，以把模型的第一组纹理坐标填充到uv0中，但在输出结构体`Varyings`中，TEXCOORD0修饰的变量含义就可以由我们自己来决定，可以用作普通变量。

在DX10以后，有了一种新的语义类型，就是系统数值语义，这类语义是以SV开头的，SV代表的含义就是**系统数值(System-value)模型。**语义描述的变量是不可以随便赋值的，因为流水线需要使用它们来完成特定的目的，例如渲染引擎会把用SV_POSITION修饰的变量经过光栅化后显示在屏幕上。在绝大多数平台上，SV_POSITION与POSITION是等价的，但在某些平台，例如PS4上必须使用SV_POSITION来修饰顶点着色器的输出，否则无法工作。同样的例子还要COLOR和SV_Target，这俩也是等价的。

## Unity支持的语义
从应用阶段传递模型数据给顶点着色器时Unity支持的常用语义

| 语义 | 描述 |
| --- | --- |
| POSITION | 模型空间中的顶点位置，通常是float4类型 |
| NORMAL | 顶点法线，通常是float3类型 |
| TANGENT | 顶点切线，通常是float4类型 |
| TEXCOORDn，如TEXCOORD0、TEXCOORD1 | 该顶点的纹理坐标，TEXCOORD0表示第一组纹理坐标，以此类推，通常是float2或float4类型 |
| COLOR | 顶点颜色，通常是fixed4或float4类型 |


其中TEXCOORDn中n的数目与Shader Model有关，例如一般在Shader Model 2（Unity默认编译到的Shader Model版本）和Shader Model 3中，n等于8，在Shader Model 4和Shader Model 5中，n等于16。通常情况下，一个模型的纹理坐标组数一般不超过2，所以我们往往只使用TEXCOORD0和TEXCOORD1。



从顶点着色器传递数据给片元着色器时Unity使用的常用语义

| 语义 | 描述 |
| --- | --- |
| SV_POSITION | 裁剪空间中的顶点坐标，结构体中必须包含一个用该语义修饰的变量。等同于POSITION，但最好使用SV_POSITION |
| COLOR0 | 通常用于输出第一组顶点颜色，通常不需要 |
| COLOR1 | 通常用于输出第二组顶点颜色，通常不需要 |
| TEXCOORD0~TEXCOORD7 | 通常用于输出纹理坐标，但通常不需要 |


以上除了SV_POSITION有特殊含义外，其他语义对变量的含义没有明确要求，也就是说我们可以存储任意值到这些语义中，通常我们会把一些自定义数据存到TEXCOORD0等中传递给片元着色器




片元着色器输出时Unity支持的常用语义

| 语义 | 描述 |  |
| --- | --- | --- |
| SV_Target | 输出值会将存储到渲染目标中。等同于COLOR，但最好使用SV_Target |  |


# 调试
VS有自带的Graph Debugger

Unity有帧调试器，在Window - >Analysis -> Frame Debugger，可以查看渲染过程



# URP中的规范
## 变量命名
通常使用空间后缀来命名变量

+ **`OS`**：Object Space，模型/对象空间。如 `positionOS`，`normalOS`。
+ **`WS`**：World Space，世界空间。如 `positionWS`，`normalWS`，`viewDirectionWS`。
+ **`VS`**：View Space，观察/视角空间。如 `positionVS`。
+ **`CS`** / **`HCS`**：Clip / Homogeneous Clip Space，裁剪空间。`positionCS` 是裁剪空间位置，`positionHCS` 特指齐次裁剪空间的位置。
+ **`TS`**：Tangent Space，切线空间。用于法线贴图相关计算，如 `normalTS`。
+ **`VS`**：View Space，观察/视角空间。如 `positionVS`。



使用`Attributes`来定义输入结构体，使用`Varyings`来定义输出结构体

## 类型使用
通常使用`halfX`来声明一个颜色变量、归一化的向量等

